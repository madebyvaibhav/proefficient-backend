import { prisma } from '../../prisma';

export async function getAllNotes(sectionId?: string, subjectId?: string) {
  return prisma.note.findMany({
    where: {
      ...(sectionId ? { sectionId } : {}),
      ...(subjectId ? { subjectId } : {})
    },
    include: {
      section: { include: { class: true } },
      subject: true,
      teacher: { include: { user: true } }
    },
    orderBy: { uploadedAt: 'desc' }
  });
}

export async function getNoteById(id: string) {
  return prisma.note.findUnique({
    where: { id },
    include: {
      section: { include: { class: true } },
      subject: true,
      teacher: { include: { user: true } }
    }
  });
}

export async function createNote(data: { sectionId: string, subjectId: string, teacherId: string, title: string, fileUrl: string, fileType: string }) {
  return prisma.note.create({ data });
}

export async function deleteNote(id: string) {
  return prisma.note.delete({ where: { id } });
}
