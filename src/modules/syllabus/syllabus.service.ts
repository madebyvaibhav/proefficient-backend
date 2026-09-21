import { prisma } from '../../prisma';

// Ensure tables exist and seed sample topics if table is empty
async function ensureTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`lecture_plan\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`subjectId\` VARCHAR(191) NOT NULL,
        \`teacherId\` VARCHAR(191) NOT NULL,
        \`classId\` VARCHAR(191) NULL,
        \`sectionId\` VARCHAR(191) NULL,
        \`academicYear\` VARCHAR(191) NULL,
        \`startDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`endDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safely add missing columns if table already existed without them
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`lecture_plan\` 
      ADD COLUMN IF NOT EXISTS \`classId\` VARCHAR(191) NULL,
      ADD COLUMN IF NOT EXISTS \`sectionId\` VARCHAR(191) NULL,
      ADD COLUMN IF NOT EXISTS \`academicYear\` VARCHAR(191) NULL;
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`lecture_item\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`lecturePlanId\` VARCHAR(191) NOT NULL,
        \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`day\` VARCHAR(191) NOT NULL DEFAULT 'Monday',
        \`topic\` VARCHAR(191) NOT NULL,
        \`chapter\` VARCHAR(191) NOT NULL,
        \`startTime\` VARCHAR(191) NULL,
        \`endTime\` VARCHAR(191) NULL,
        \`homework\` TEXT NULL,
        \`notes\` TEXT NULL,
        \`status\` VARCHAR(191) NOT NULL DEFAULT 'pending',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`lecture_item\`
      ADD COLUMN IF NOT EXISTS \`startTime\` VARCHAR(191) NULL,
      ADD COLUMN IF NOT EXISTS \`endTime\` VARCHAR(191) NULL,
      ADD COLUMN IF NOT EXISTS \`homework\` TEXT NULL,
      ADD COLUMN IF NOT EXISTS \`notes\` TEXT NULL;
    `).catch(() => {});
  } catch (err) {
    console.log('[Syllabus] Table check:', err);
  }
}

// Seed default syllabus for teachers (Disabled auto mock seeding; clean state for manual user entry)
export async function seedDefaultSyllabusIfEmpty() {
  await ensureTables();
  try {
    // Delete any legacy mock syllabus plans and items from database
    await prisma.$executeRawUnsafe(`DELETE FROM \`lecture_item\`;`).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM \`lecture_plan\`;`).catch(() => {});
    // Clean unassigned teacher-subject records where teacherId IS NULL
    await prisma.$executeRawUnsafe(`DELETE FROM \`class_subject\` WHERE \`teacherId\` IS NULL;`).catch(() => {});
  } catch (e) {
    console.error('Error clearing mock syllabus:', e);
  }
}

export async function getSyllabusPlans(filters: {
  teacherId?: string;
  subjectId?: string;
}) {
  await ensureTables();
  await seedDefaultSyllabusIfEmpty();

  const where: any = {};
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  const plans = await prisma.lecturePlan.findMany({
    where,
    include: {
      subject: true,
      teacher: {
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
          classSubjects: { include: { class: true } },
        },
      },
      items: {
        orderBy: [{ chapter: 'asc' }, { date: 'asc' }],
      },
    },
  });

  return plans.map((plan) => {
    const totalTopics = plan.items.length;
    const completedTopics = plan.items.filter((i) => i.status === 'completed').length;
    const inProgressTopics = plan.items.filter((i) => i.status === 'in_progress').length;
    const pendingTopics = plan.items.filter((i) => i.status === 'pending').length;
    const completionPercentage =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // Group items by Chapter
    const chaptersMap: Record<string, typeof plan.items> = {};
    for (const item of plan.items) {
      if (!chaptersMap[item.chapter]) chaptersMap[item.chapter] = [];
      chaptersMap[item.chapter].push(item);
    }

    const chapters = Object.keys(chaptersMap).map((chapterName) => {
      const cItems = chaptersMap[chapterName];
      const cTotal = cItems.length;
      const cCompleted = cItems.filter((i) => i.status === 'completed').length;
      return {
        chapterName,
        totalTopics: cTotal,
        completedTopics: cCompleted,
        completionPercentage: cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0,
        status:
          cCompleted === cTotal
            ? 'completed'
            : cCompleted > 0
            ? 'in_progress'
            : 'pending',
        items: cItems,
      };
    });

    return {
      ...plan,
      totalTopics,
      completedTopics,
      inProgressTopics,
      pendingTopics,
      completionPercentage,
      chapters,
    };
  });
}

export async function getSyllabusSummary() {
  const plans = await getSyllabusPlans({});

  return plans.map((p) => ({
    planId: p.id,
    teacherId: p.teacherId,
    teacherName: p.teacher.user.name,
    teacherEmail: p.teacher.user.email,
    employeeId: p.teacher.employeeId,
    subjectId: p.subjectId,
    subjectName: p.subject.name,
    totalTopics: p.totalTopics,
    completedTopics: p.completedTopics,
    inProgressTopics: p.inProgressTopics,
    pendingTopics: p.pendingTopics,
    completionPercentage: p.completionPercentage,
    totalChapters: p.chapters.length,
    completedChapters: p.chapters.filter((c) => c.status === 'completed').length,
    startDate: p.startDate,
    endDate: p.endDate,
    chapters: p.chapters,
    items: p.items,
  }));
}

export async function createSyllabusPlan(data: {
  subjectId: string;
  teacherId: string;
  classId?: string;
  sectionId?: string;
  academicYear?: string;
  startDate?: Date;
  endDate?: Date;
  chapter: string;
  topics: string[];
}) {
  await ensureTables();

  let plan = await prisma.lecturePlan.findFirst({
    where: { subjectId: data.subjectId, teacherId: data.teacherId },
  });

  if (!plan) {
    plan = await prisma.lecturePlan.create({
      data: {
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        classId: data.classId || null,
        sectionId: data.sectionId || null,
        academicYear: data.academicYear || '2026-2027',
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(Date.now() + 180 * 86400000),
      },
    });
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const createdItems = [];

  for (let i = 0; i < data.topics.length; i++) {
    const item = await prisma.lectureItem.create({
      data: {
        lecturePlanId: plan.id,
        chapter: data.chapter.trim(),
        topic: data.topics[i].trim(),
        day: days[i % days.length],
        date: new Date(),
        status: 'pending',
      },
    });
    createdItems.push(item);
  }

  return { plan, createdItems };
}

export async function addSyllabusTopic(data: {
  lecturePlanId: string;
  chapter: string;
  topic: string;
  date?: Date;
  day?: string;
  startTime?: string;
  endTime?: string;
  homework?: string;
  notes?: string;
  status?: string;
}) {
  await ensureTables();

  return prisma.lectureItem.create({
    data: {
      lecturePlanId: data.lecturePlanId,
      chapter: data.chapter.trim(),
      topic: data.topic.trim(),
      date: data.date || new Date(),
      day: data.day || 'Monday',
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      homework: data.homework || null,
      notes: data.notes || null,
      status: data.status || 'pending',
    },
  });
}

export async function updateSyllabusTopicStatus(
  id: string,
  data: {
    status?: string;
    topic?: string;
    chapter?: string;
    date?: Date;
    day?: string;
    startTime?: string;
    endTime?: string;
    homework?: string;
    notes?: string;
  }
) {
  await ensureTables();

  return prisma.lectureItem.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.topic ? { topic: data.topic } : {}),
      ...(data.chapter ? { chapter: data.chapter } : {}),
      ...(data.date ? { date: data.date } : {}),
      ...(data.day ? { day: data.day } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.homework !== undefined ? { homework: data.homework } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
}

export async function deleteSyllabusTopic(id: string) {
  return prisma.lectureItem.delete({ where: { id } });
}

export async function deleteSyllabusPlan(id: string) {
  return prisma.lecturePlan.delete({ where: { id } });
}
