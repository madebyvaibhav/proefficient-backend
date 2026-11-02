import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';

export async function getAllStudents(query: { classId?: string; sectionId?: string; status?: string; search?: string }) {
  const where: any = {};
  if (query.classId) where.classId = query.classId;
  if (query.sectionId) where.sectionId = query.sectionId;
  if (query.status || query.search) {
    where.user = {
      ...(where.user || {}),
      ...(query.status && { status: query.status }),
      ...(query.search && { name: { contains: query.search } }),
    };
  }

  return prisma.studentProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true, status: true, avatar: true } },
      class: true,
      section: true,
    },
    orderBy: {
      admissionDate: 'desc',
    },
  });
}

export async function getStudentById(id: string) {
  return prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: true,
      class: true,
      section: true,
      parentLinks: {
        include: { parent: true }
      }
    }
  });
}

export async function createStudent(data: any) {
  const rawPassword =
    data.password && data.password.trim()
      ? data.password.trim()
      : data.mobile && data.mobile.trim()
      ? data.mobile.trim()
      : 'student@123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        password: hashedPassword,
        role: 'student',
        avatar: data.avatar || null,
      }
    });

    let sectionId = data.sectionId;
    if (!sectionId && data.classId) {
      let section = await tx.section.findFirst({ where: { classId: data.classId } });
      if (!section) {
        section = await tx.section.create({ data: { classId: data.classId, name: 'A' } });
      }
      sectionId = section.id;
    }

    const profile = await tx.studentProfile.create({
      data: {
        userId: user.id,
        rollNumber: data.rollNumber || `ADM-${Date.now().toString().slice(-6)}`,
        classId: data.classId,
        sectionId: sectionId,
        gender: data.gender || 'Male',
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
        dob: data.dob ? new Date(data.dob) : null,
        address: data.address || null
      },
      include: {
        user: true,
        class: true,
        section: true,
      }
    });
    return profile;
  });
}

export async function updateStudent(id: string, data: any) {
  const profile = await prisma.studentProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Student not found');

  // Update user data separately
  if (data.name || data.email || data.mobile || data.avatar !== undefined) {
    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.mobile && { mobile: data.mobile }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
    });
  }

  return prisma.studentProfile.update({
    where: { id },
    data: {
      ...(data.classId && { classId: data.classId }),
      ...(data.sectionId && { sectionId: data.sectionId }),
      ...(data.gender && { gender: data.gender }),
      ...(data.admissionDate && { admissionDate: new Date(data.admissionDate) }),
      ...(data.dob && { dob: new Date(data.dob) }),
      ...(data.address && { address: data.address }),
    },
    include: {
      user: true,
      class: true,
      section: true,
    }
  });
}

export async function updateStudentStatus(id: string, status: any) {
  const profile = await prisma.studentProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Student not found');
  return prisma.user.update({
    where: { id: profile.userId },
    data: { status }
  });
}

export async function getStudentParents(studentId: string) {
  return prisma.parentStudent.findMany({
    where: { studentId },
    include: {
      parent: true
    }
  });
}

export async function deleteStudent(id: string) {
  let profile = await prisma.studentProfile.findUnique({ where: { id } });
  if (!profile) {
    profile = await prisma.studentProfile.findFirst({ where: { userId: id } });
  }
  if (!profile) throw new Error('Student not found');

  const studentProfileId = profile.id;
  const studentUserId = profile.userId;

  return prisma.$transaction(async (tx) => {
    // 1. Parent links and cleanup orphaned parent accounts
    const parentLinks = await tx.parentStudent.findMany({
      where: { studentId: studentProfileId },
      select: { parentId: true },
    });
    const parentIds = parentLinks.map((p) => p.parentId);
    await tx.parentStudent.deleteMany({
      where: { studentId: studentProfileId },
    });

    for (const parentId of parentIds) {
      const remainingChildren = await tx.parentStudent.count({
        where: { parentId },
      });
      if (remainingChildren === 0) {
        const parentUser = await tx.user.findUnique({ where: { id: parentId } });
        if (parentUser && parentUser.role === 'parent') {
          await tx.notification.deleteMany({ where: { userId: parentId } }).catch(() => {});
          await tx.fCMToken.deleteMany({ where: { userId: parentId } }).catch(() => {});
          await tx.refreshToken.deleteMany({ where: { userId: parentId } }).catch(() => {});
          await tx.user.delete({ where: { id: parentId } }).catch(() => {});
        }
      }
    }

    // 2. Fees and payments
    const fees = await tx.fee.findMany({
      where: { studentId: studentProfileId },
      select: { id: true },
    });
    const feeIds = fees.map((f) => f.id);
    if (feeIds.length > 0) {
      await tx.feePayment.deleteMany({
        where: { feeId: { in: feeIds } },
      });
    }
    await tx.fee.deleteMany({
      where: { studentId: studentProfileId },
    });

    // 3. Attendance
    await tx.attendance.deleteMany({
      where: { studentId: studentProfileId },
    });

    // 4. Marks
    await tx.mark.deleteMany({
      where: { studentId: studentProfileId },
    });

    // 5. Remarks
    await tx.remark.deleteMany({
      where: { studentId: studentProfileId },
    });

    // 6. Student Profile
    await tx.studentProfile.delete({
      where: { id: studentProfileId },
    });

    // 7. Student User & tokens/notifications
    await tx.notification.deleteMany({
      where: { userId: studentUserId },
    }).catch(() => {});
    await tx.fCMToken.deleteMany({
      where: { userId: studentUserId },
    }).catch(() => {});
    await tx.refreshToken.deleteMany({
      where: { userId: studentUserId },
    }).catch(() => {});
    await tx.user.delete({
      where: { id: studentUserId },
    });

    return { success: true, message: 'Student and related records deleted successfully' };
  });
}

