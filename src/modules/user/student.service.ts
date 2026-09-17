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
        role: 'student'
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
  if (data.name || data.email || data.mobile) {
    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.mobile && { mobile: data.mobile }),
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
  const profile = await prisma.studentProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Student not found');
  
  return prisma.user.delete({
    where: { id: profile.userId }
  });
}
