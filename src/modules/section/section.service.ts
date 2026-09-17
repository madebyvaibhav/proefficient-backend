import { prisma } from '../../prisma';

export const getAllSections = async (classId?: string) => {
  return prisma.section.findMany({
    where: classId ? { classId } : undefined,
    include: {
      class: true,
      classTeacher: {
        include: { user: true },
      },
      _count: {
        select: { students: true },
      },
    },
  });
};

export const getSectionById = async (id: string) => {
  return prisma.section.findUnique({
    where: { id },
    include: {
      class: true,
      students: {
        include: { user: true },
      },
      timetable: true,
    },
  });
};

export const createSection = async (data: { name: string; classId: string; classTeacherId?: string }) => {
  return prisma.section.create({ data });
};

export const updateSection = async (id: string, data: any) => {
  return prisma.section.update({ where: { id }, data });
};

export const deleteSection = async (id: string) => {
  return prisma.section.delete({ where: { id } });
};

export const getSectionStudents = async (sectionId: string) => {
  return prisma.studentProfile.findMany({
    where: { sectionId },
    include: { user: true },
  });
};
