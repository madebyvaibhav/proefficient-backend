import { prisma } from '../../prisma';

export const getAllSubjects = async (classId?: string) => {
  if (classId) {
    return prisma.subject.findMany({
      where: {
        classSubjects: {
          some: { classId },
        },
      },
      include: {
        classSubjects: {
          include: { class: true, teacher: { include: { user: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
  return prisma.subject.findMany({
    include: {
      classSubjects: {
        include: { class: true, teacher: { include: { user: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getSubjectById = async (id: string) => {
  return prisma.subject.findUnique({
    where: { id },
    include: {
      classSubjects: {
        include: { class: true, teacher: { include: { user: true } } },
      },
    },
  });
};

export const createSubject = async (data: { name: string; code?: string; classIds?: string[] }) => {
  const subject = await prisma.subject.upsert({
    where: { name: data.name },
    create: {
      name: data.name,
      code: data.code || null,
    },
    update: {
      code: data.code || undefined,
    },
  });

  if (data.classIds && Array.isArray(data.classIds) && data.classIds.length > 0) {
    for (const classId of data.classIds) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId, subjectId: subject.id } },
        create: { classId, subjectId: subject.id },
        update: {},
      });
    }
  }

  return prisma.subject.findUnique({
    where: { id: subject.id },
    include: { classSubjects: { include: { class: true } } },
  });
};

export const updateSubject = async (id: string, data: { name?: string; code?: string; classIds?: string[] }) => {
  const updated = await prisma.subject.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code || undefined,
    },
  });

  if (data.classIds && Array.isArray(data.classIds) && data.classIds.length > 0) {
    for (const classId of data.classIds) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId, subjectId: id } },
        create: { classId, subjectId: id },
        update: {},
      });
    }
  }

  return prisma.subject.findUnique({
    where: { id },
    include: { classSubjects: { include: { class: true } } },
  });
};

export const deleteSubject = async (id: string) => {
  return prisma.subject.delete({ where: { id } });
};
