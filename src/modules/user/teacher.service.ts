import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';

export async function getAllTeachers(query?: any) {
  const where: any = {};
  if (query?.status) {
    where.user = { status: query.status };
  }
  return prisma.teacherProfile.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, mobile: true, status: true, avatar: true }
      },
      classSubjects: {
        include: { class: true, subject: true }
      }
    }
  });
}

export async function getTeacherById(id: string) {
  return prisma.teacherProfile.findUnique({
    where: { id },
    include: {
      user: true,
      classSubjects: {
        include: { class: true, subject: true }
      },
      classSections: {
        include: { class: true }
      },
      timetableEntries: {
        include: { subject: true, section: { include: { class: true } } }
      }
    }
  });
}

export async function createTeacher(data: any) {
  const rawPassword =
    data.password && data.password.trim()
      ? data.password.trim()
      : data.mobile && data.mobile.trim()
      ? data.mobile.trim()
      : 'teacher@123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        password: hashedPassword,
        role: 'teacher'
      }
    });

    const subjectExpertise = data.subjectExpertise ? JSON.stringify(data.subjectExpertise) : null;

    const profile = await tx.teacherProfile.create({
      data: {
        userId: user.id,
        employeeId: data.employeeId || `FAC-${Date.now().toString().slice(-4)}`,
        qualification: data.qualification || null,
        subjectExpertise,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined
      },
      include: {
        user: true,
      }
    });
    return profile;
  });
}

export async function updateTeacher(id: string, data: any) {
  const profile = await prisma.teacherProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Teacher profile not found');

  if (data.name || data.email || data.mobile) {
    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.email && { email: data.email.trim() }),
        ...(data.mobile && { mobile: data.mobile.trim() }),
      },
    });
  }

  const subjectExpertise = data.subjectExpertise ? JSON.stringify(data.subjectExpertise) : undefined;
  return prisma.teacherProfile.update({
    where: { id },
    data: {
      ...(data.employeeId && { employeeId: data.employeeId }),
      ...(data.qualification && { qualification: data.qualification }),
      ...(subjectExpertise && { subjectExpertise }),
      ...(data.joiningDate && { joiningDate: new Date(data.joiningDate) }),
    },
    include: {
      user: true,
    }
  });
}

export async function updateTeacherStatus(id: string, status: any) {
  const profile = await prisma.teacherProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Teacher not found');

  return prisma.user.update({
    where: { id: profile.userId },
    data: { status }
  });
}

export async function deleteTeacher(id: string) {
  const profile = await prisma.teacherProfile.findUnique({ where: { id } });
  if (!profile) throw new Error('Teacher not found');
  
  return prisma.user.delete({
    where: { id: profile.userId }
  });
}
