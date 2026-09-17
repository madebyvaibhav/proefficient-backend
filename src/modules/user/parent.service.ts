import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';

export async function getAllParents() {
  return prisma.user.findMany({
    where: { role: 'parent' },
    include: {
      parentLinks: {
        include: {
          student: {
            include: { user: true, class: true, section: true }
          }
        }
      }
    }
  });
}

export async function getParentById(id: string) {
  return prisma.user.findFirst({
    where: { id, role: 'parent' },
    include: {
      parentLinks: {
        include: {
          student: {
            include: { user: true, class: true, section: true }
          }
        }
      }
    }
  });
}

export async function createParent(data: any) {
  const rawPassword =
    data.password && data.password.trim()
      ? data.password.trim()
      : data.mobile && data.mobile.trim()
      ? data.mobile.trim()
      : 'parent@123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      password: hashedPassword,
      role: 'parent'
    }
  });
}

export async function updateParent(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.email && { email: data.email.trim() }),
      ...(data.mobile && { mobile: data.mobile.trim() }),
      ...(data.status && { status: data.status }),
    },
  });
}

export async function linkStudent(data: { parentId: string; studentId: string; relation: string }) {
  return prisma.parentStudent.create({
    data: {
      parentId: data.parentId,
      studentId: data.studentId,
      relation: data.relation
    }
  });
}

export async function unlinkStudent(linkId: string) {
  return prisma.parentStudent.delete({
    where: { id: linkId }
  });
}

export async function getChildren(parentId: string) {
  return prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          user: true,
          class: true,
          section: true
        }
      }
    }
  });
}
