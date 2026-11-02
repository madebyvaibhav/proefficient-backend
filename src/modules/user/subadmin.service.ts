import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';

export async function getAllSubAdmins() {
  const users = await prisma.user.findMany({
    where: {
      isMainAdmin: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      isMainAdmin: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.filter(u => {
    const email = (u.email || '').toLowerCase();
    if (
      email === 'admin@proefficient.edu' ||
      email === 'admin@proficient.edu' ||
      email === 'admin@gmail.com' ||
      email === 'proficientinstituteoflearning@gmail.com' ||
      email === 'admin@proficientinstitute.com'
    ) {
      return false;
    }
    if (u.role === 'admin') return true;
    let perms = u.permissions;
    if (typeof perms === 'string') {
      try {
        perms = JSON.parse(perms);
      } catch (_) {}
    }
    if (Array.isArray(perms) && perms.length > 0) return true;
    return false;
  });
}

export async function createSubAdmin(data: {
  name: string;
  email: string;
  mobile?: string;
  password?: string;
  permissions?: string[];
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        ...(data.mobile ? [{ mobile: data.mobile }] : []),
      ],
    },
  });

  if (existing) {
    if (existing.isMainAdmin) {
      throw new Error('Cannot assign Sub-Admin permissions to Main Admin');
    }
    const updateData: any = {
      permissions: data.permissions || [],
      role: 'admin',
      isMainAdmin: false,
    };
    if (data.name && data.name.trim()) updateData.name = data.name.trim();
    if (data.password && data.password.trim()) {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        isMainAdmin: true,
        permissions: true,
        createdAt: true,
      },
    });
  }

  const rawPassword =
    data.password && data.password.trim()
      ? data.password.trim()
      : data.mobile && data.mobile.trim()
      ? data.mobile.trim()
      : 'admin@123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      mobile: data.mobile || null,
      password: hashedPassword,
      role: 'admin',
      isMainAdmin: false,
      permissions: data.permissions || [],
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      isMainAdmin: true,
      permissions: true,
      createdAt: true,
    },
  });
}

export async function updateSubAdmin(id: string, data: {
  name?: string;
  email?: string;
  mobile?: string;
  password?: string;
  permissions?: string[];
  status?: any;
}) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isMainAdmin) {
    throw new Error('Sub-Admin not found or cannot modify Main Admin');
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.mobile !== undefined) updateData.mobile = data.mobile;
  if (data.status) updateData.status = data.status;
  if (data.permissions !== undefined) updateData.permissions = data.permissions;
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      isMainAdmin: true,
      permissions: true,
      updatedAt: true,
    },
  });
}

export async function deleteSubAdmin(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isMainAdmin) {
    throw new Error('Cannot delete this user');
  }
  return prisma.user.delete({ where: { id } });
}
