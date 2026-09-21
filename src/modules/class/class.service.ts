import { prisma } from '../../prisma';
import * as fs from 'fs';
import * as path from 'path';

function saveBase64ToFile(base64Data: string, subFolder: string, defaultExt = 'jpg'): string {
  if (!base64Data || typeof base64Data !== 'string') return '';
  if (!base64Data.startsWith('data:')) return base64Data;

  try {
    const matches = base64Data.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;

    const mimeType = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = defaultExt;
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetDir = path.join(process.cwd(), 'uploads', subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);

    return `/uploads/${subFolder}/${filename}`;
  } catch (err) {
    console.error('Error saving base64 file:', err);
    return base64Data;
  }
}

export const getAllClasses = async () => {
  return prisma.class.findMany({
    include: {
      _count: {
        select: { sections: true, students: true },
      },
    },
    orderBy: { standard: 'asc' },
  });
};

export const getClassById = async (id: string) => {
  return prisma.class.findUnique({
    where: { id },
    include: {
      sections: true,
      subjects: {
        include: { subject: true, teacher: { include: { user: { select: { name: true } } } } },
      },
      students: { include: { user: { select: { name: true, email: true } } } },
    },
  });
};

export const createClass = async (data: { name: string; standard?: number; feeAmount?: number }) => {
  const std = data.standard ? Number(data.standard) : 10;
  const fee = data.feeAmount !== undefined && data.feeAmount !== null ? Number(data.feeAmount) : 0;
  return prisma.class.create({
    data: {
      name: data.name,
      standard: std,
      feeAmount: fee,
    },
  });
};

export const updateClass = async (id: string, data: any) => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.standard !== undefined) updateData.standard = Number(data.standard);
  if (data.feeAmount !== undefined) updateData.feeAmount = Number(data.feeAmount);
  if (data.timetableDocument !== undefined) {
    if (data.timetableDocument && data.timetableDocument.startsWith('data:')) {
      // Detect document type from MIME in base64 header
      const isPdf = data.timetableDocument.startsWith('data:application/pdf');
      updateData.timetableDocument = saveBase64ToFile(data.timetableDocument, 'timetables', isPdf ? 'pdf' : 'jpg');
      updateData.timetableDocumentType = isPdf ? 'PDF' : 'IMAGE';
      updateData.timetableDocumentName = data.timetableDocumentName || (isPdf ? 'timetable.pdf' : 'timetable.jpg');
    } else {
      updateData.timetableDocument = data.timetableDocument;
      // null means deletion
      if (data.timetableDocument === null) {
        updateData.timetableDocumentType = null;
        updateData.timetableDocumentName = null;
      }
    }
    updateData.timetableUpdatedAt = new Date();
  }
  return (prisma.class as any).update({ where: { id }, data: updateData });
};

export const deleteClass = async (id: string) => {
  return prisma.class.delete({ where: { id } });
};

export const getClassStudents = async (classId: string) => {
  return prisma.studentProfile.findMany({
    where: { classId },
    include: { user: { select: { name: true, email: true, mobile: true, status: true } }, section: true },
    orderBy: { rollNumber: 'asc' },
  });
};

export const assignSubjects = async (classId: string, data: { subjects: { subjectId: string; teacherId?: string }[] }) => {
  const subjectsData = data.subjects.map((sub: any) => ({
    classId,
    subjectId: sub.subjectId,
    teacherId: sub.teacherId || null,
  }));
  return prisma.classSubject.createMany({ data: subjectsData });
};

// ── Teacher-Subject-Batch Assignment Services ──
export const getAllAssignments = async () => {
  return prisma.classSubject.findMany({
    where: {
      teacherId: { not: null },
    },
    include: {
      class: true,
      subject: true,
      teacher: {
        include: {
          user: { select: { name: true, email: true, mobile: true } },
        },
      },
    },
    orderBy: [
      { class: { standard: 'asc' } },
      { subject: { name: 'asc' } },
    ],
  });
};

export const assignTeacherToSubject = async (data: { classId: string; subjectId: string; teacherId: string }) => {
  return prisma.classSubject.upsert({
    where: {
      classId_subjectId: {
        classId: data.classId,
        subjectId: data.subjectId,
      },
    },
    create: {
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
    },
    update: {
      teacherId: data.teacherId,
    },
    include: {
      class: true,
      subject: true,
      teacher: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
};

export const removeAssignment = async (id: string) => {
  return prisma.classSubject.delete({
    where: { id },
  });
};
