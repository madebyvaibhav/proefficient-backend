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

// Seed default syllabus for teachers if plans are empty
export async function seedDefaultSyllabusIfEmpty() {
  await ensureTables();

  try {
    const existingCount = await prisma.lecturePlan.count().catch(() => 0);
    if (existingCount > 0) return;

    // Fetch teachers with subjects
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        classSubjects: { include: { subject: true, class: true } },
      },
    });

    const sampleCurriculum: Record<string, { chapter: string; topics: string[] }[]> = {
      Mathematics: [
        {
          chapter: 'Chapter 1: Real Numbers & Polynomials',
          topics: [
            'Euclid Division Lemma & Fundamental Theorem of Arithmetic',
            'Irrational Numbers & Decimal Expansions',
            'Zeroes of Polynomials & Geometrical Meaning',
            'Relationship between Zeroes and Coefficients',
          ],
        },
        {
          chapter: 'Chapter 2: Quadratic Equations',
          topics: [
            'Standard Form of Quadratic Equations',
            'Solution by Factorization & Completing the Square',
            'Quadratic Formula & Nature of Roots',
            'Word Problems & Application Questions',
          ],
        },
        {
          chapter: 'Chapter 3: Coordinate Geometry & Vectors',
          topics: [
            'Distance Formula & Section Formula',
            'Area of Triangles & Collinearity',
            'Vector Addition & Scalar Product',
          ],
        },
        {
          chapter: 'Chapter 4: Calculus & Differentiation',
          topics: [
            'Limits and Continuity Basics',
            'Derivatives of Trigonometric & Algebraic Functions',
            'Chain Rule & Product Rule',
            'Applications of Derivatives: Tangents and Maxima',
          ],
        },
      ],
      Physics: [
        {
          chapter: 'Unit 1: Kinematics & Laws of Motion',
          topics: [
            'Scalars and Vectors, 1D & 2D Motion',
            'Projectile Motion & Relative Velocity',
            'Newton Laws of Motion & Friction',
            'Circular Motion & Centripetal Acceleration',
          ],
        },
        {
          chapter: 'Unit 2: Work, Energy and Power',
          topics: [
            'Work done by Constant and Variable Forces',
            'Kinetic and Potential Energy Theorem',
            'Conservation of Mechanical Energy',
            'Elastic and Inelastic Collisions',
          ],
        },
        {
          chapter: 'Unit 3: Ray Optics and Optical Instruments',
          topics: [
            'Reflection and Refraction at Spherical Surfaces',
            'Total Internal Reflection & Prism Dispersion',
            'Lens Maker Formula & Optical Instruments',
          ],
        },
        {
          chapter: 'Unit 4: Current Electricity',
          topics: [
            'Ohm Law, Drift Velocity and Resistivity',
            'Kirchhoff Laws & Wheatstone Bridge',
            'Potentiometer & Internal Resistance',
          ],
        },
      ],
      Chemistry: [
        {
          chapter: 'Unit 1: Chemical Bonding & Molecular Structure',
          topics: [
            'Ionic and Covalent Bonds & Lewis Dot Structures',
            'VSEPR Theory & Hybridization',
            'Molecular Orbital Theory of Diatomic Molecules',
          ],
        },
        {
          chapter: 'Unit 2: Organic Chemistry - Hydrocarbons',
          topics: [
            'IUPAC Nomenclature & Isomerism',
            'Alkanes, Alkenes & Mechanism of Electrophilic Addition',
            'Aromatic Hydrocarbons & Friedel-Crafts Reactions',
          ],
        },
        {
          chapter: 'Unit 3: Chemical Thermodynamics & Equilibrium',
          topics: [
            'First & Second Law of Thermodynamics',
            'Enthalpy, Entropy & Gibbs Free Energy',
            'Le Chatelier Principle & pH Calculations',
          ],
        },
      ],
      Biology: [
        {
          chapter: 'Unit 1: Human Physiology & Digestion',
          topics: [
            'Alimentary Canal and Digestive Glands',
            'Enzymatic Digestion of Carbohydrates & Proteins',
            'Absorption and Nutritional Disorders',
          ],
        },
        {
          chapter: 'Unit 2: Genetics and Evolution',
          topics: [
            'Mendelian Inheritance & Chromosomal Theory',
            'DNA Structure, Replication and Transcription',
            'Genetic Code, Translation & Mutations',
          ],
        },
      ],
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const t of teachers) {
      // Find subjects
      const subjectIds = Array.from(new Set(t.classSubjects.map((cs) => cs.subjectId)));
      for (const subId of subjectIds) {
        const sub = t.classSubjects.find((cs) => cs.subjectId === subId)?.subject;
        if (!sub) continue;

        const subNameKey =
          Object.keys(sampleCurriculum).find((k) =>
            sub.name.toLowerCase().includes(k.toLowerCase())
          ) || 'Mathematics';
        const curriculum = sampleCurriculum[subNameKey] || sampleCurriculum['Mathematics'];

        const plan = await prisma.lecturePlan.create({
          data: {
            subjectId: sub.id,
            teacherId: t.id,
            startDate: new Date('2026-06-15'),
            endDate: new Date('2026-12-20'),
          },
        });

        let dayIdx = 0;
        let chapterIdx = 0;
        for (const chap of curriculum) {
          chapterIdx++;
          let topicIdx = 0;
          for (const top of chap.topics) {
            topicIdx++;
            // All new syllabus topics start as pending (0% covered)
            const status = 'pending';

            const itemDate = new Date(Date.now() - (15 - (chapterIdx * 3 + topicIdx)) * 86400000);

            await prisma.lectureItem.create({
              data: {
                lecturePlanId: plan.id,
                chapter: chap.chapter,
                topic: top,
                day: days[dayIdx % days.length],
                date: itemDate,
                status,
              },
            });
            dayIdx++;
          }
        }
      }
    }

    // Reset any old pre-seeded fake completed topics back to pending so reports show true 0% until lectures are conducted
    await prisma.$executeRawUnsafe(`UPDATE \`lecture_item\` SET \`status\` = 'pending' WHERE \`status\` != 'pending';`).catch(() => {});
    console.log('✅ Default curriculum seeded for syllabus tracker (all starting as pending).');
  } catch (e) {
    console.error('Error seeding default syllabus:', e);
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
