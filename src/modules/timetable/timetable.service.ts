import { prisma } from '../../prisma';

function parseTime(timeStr: string) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function isOverlapping(start1: string, end1: string, start2: string, end2: string) {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  
  return s1 < e2 && e1 > s2;
}

export async function checkConflict(teacherId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
  const existing = await prisma.timetableEntry.findMany({
    where: {
      teacherId,
      dayOfWeek,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined
    }
  });

  for (const entry of existing) {
    if (isOverlapping(startTime, endTime, entry.startTime, entry.endTime)) {
      return true;
    }
  }
  return false;
}

export async function getSectionTimetable(sectionId: string) {
  return prisma.timetableEntry.findMany({
    where: { sectionId, isActive: true },
    include: {
      subject: true,
      teacher: { include: { user: true } }
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
}

export async function createEntry(data: any) {
  return prisma.timetableEntry.create({ data });
}

export async function updateEntry(id: string, data: any) {
  return prisma.timetableEntry.update({
    where: { id },
    data
  });
}

export async function deleteEntry(id: string) {
  return prisma.timetableEntry.delete({
    where: { id }
  });
}

export async function clearSectionTimetable(sectionId: string, dayOfWeek?: number) {
  return prisma.timetableEntry.deleteMany({
    where: {
      sectionId,
      ...(dayOfWeek ? { dayOfWeek } : {}),
    },
  });
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function enrichWithLecturePlanner(entries: any[], targetDate?: Date) {
  for (const entry of entries) {
    if (!entry.teacherId || !entry.subjectId) continue;

    const lecturePlan = await prisma.lecturePlan.findFirst({
      where: { teacherId: entry.teacherId, subjectId: entry.subjectId },
      include: { items: { orderBy: { date: 'asc' } } }
    });

    if (lecturePlan && lecturePlan.items) {
      const items = lecturePlan.items;
      const dayName = DAY_NAMES[entry.dayOfWeek] || '';
      
      let bestItem = items.find((i: any) => i.day === dayName && i.status !== 'completed');
      if (!bestItem) {
        bestItem = items.find((i: any) => i.status === 'pending' || i.status === 'in_progress');
      }
      
      if (bestItem) {
        entry.plannedTopic = bestItem.topic;
        entry.plannedChapter = bestItem.chapter;
        entry.topicStatus = bestItem.status;
      }
    }
  }
  return entries;
}

export async function getTeacherSchedule(userId: string, dayOfWeek?: number) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId }
  });
  if (!teacherProfile) throw new Error('Teacher profile not found');

  const where: any = {
    teacherId: teacherProfile.id,
    isActive: true,
  };

  if (dayOfWeek !== undefined && !isNaN(dayOfWeek)) {
    where.dayOfWeek = dayOfWeek;
  }

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: {
      section: { include: { class: true } },
      subject: true
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  return enrichWithLecturePlanner(entries);
}

export async function getStudentSchedule(userId: string, dayOfWeek?: number) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId }
  });
  if (!profile || !profile.sectionId) throw new Error('Student profile or section not found');

  const where: any = {
    sectionId: profile.sectionId,
    isActive: true,
  };

  if (dayOfWeek !== undefined && !isNaN(dayOfWeek)) {
    where.dayOfWeek = dayOfWeek;
  }

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: {
      subject: true,
      teacher: { include: { user: true } }
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  return enrichWithLecturePlanner(entries);
}
