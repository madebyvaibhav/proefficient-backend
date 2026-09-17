import { prisma } from '../../prisma';
import { RemarkType } from '@prisma/client';

export async function getAllRemarks(classId?: string, teacherId?: string, type?: RemarkType) {
  return prisma.remark.findMany({
    where: {
      ...(classId ? { student: { classId } } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(type ? { type } : {})
    },
    include: {
      student: { include: { user: true, class: true, section: true } },
      teacher: { include: { user: true } }
    }
  });
}

export async function getRemarkById(id: string) {
  return prisma.remark.findUnique({
    where: { id },
    include: {
      student: { include: { user: true, class: true, section: true } },
      teacher: { include: { user: true } }
    }
  });
}

export async function createRemark(data: { studentId: string, teacherId: string, type: RemarkType, content: string, isVisibleToParent: boolean }) {
  const remark = await prisma.remark.create({ data });

  // Dispatch notifications to student and linked parents
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentId },
      include: {
        user: { select: { id: true, name: true } },
        parentLinks: { include: { parent: { select: { id: true } } } },
      }
    });

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: data.teacherId },
      include: { user: { select: { name: true } } }
    });

    const teacherName = teacher?.user?.name || 'Teacher';
    const studentName = student?.user?.name || 'Student';
    const notifications: any[] = [];

    // Notify Student
    if (student?.userId) {
      notifications.push({
        userId: student.userId,
        title: `💬 Teacher Remark (${data.type})`,
        body: `${teacherName} added a remark: "${data.content}".`,
        type: 'REMARK',
      });
    }

    // Notify Parent(s) if isVisibleToParent
    if (data.isVisibleToParent && student?.parentLinks) {
      for (const link of student.parentLinks) {
        if (link.parent?.id) {
          notifications.push({
            userId: link.parent.id,
            title: `💬 Teacher Remark for ${studentName}`,
            body: `Teacher ${teacherName} added a ${data.type.toLowerCase()} remark: "${data.content}".`,
            type: 'REMARK',
          });
        }
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (err) {
    console.error('Failed to dispatch remark notifications:', err);
  }

  return remark;
}

export async function updateRemark(id: string, data: any) {
  return prisma.remark.update({ where: { id }, data });
}

export async function deleteRemark(id: string) {
  return prisma.remark.delete({ where: { id } });
}

export async function getStudentRemarks(studentId: string) {
  return prisma.remark.findMany({
    where: { studentId },
    include: { teacher: { include: { user: true } } },
    orderBy: { createdAt: 'desc' }
  });
}
