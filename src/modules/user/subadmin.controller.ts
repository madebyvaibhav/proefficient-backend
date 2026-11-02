import * as subAdminService from './subadmin.service';
import { prisma } from '../../prisma';

async function isMainAdminUser(requestUser: any): Promise<boolean> {
  if (!requestUser) return false;
  if (requestUser.role !== 'admin') return false;
  if (requestUser.isMainAdmin === true) return true;

  const adminEmails = [
    'admin@proefficient.edu',
    'admin@proficient.edu',
    'admin@gmail.com',
    'admin@proficientinstitute.com',
    'proficientinstituteoflearning@gmail.com',
  ];
  const userEmail = (requestUser.email || '').toLowerCase();
  if (adminEmails.includes(userEmail)) return true;

  if (requestUser.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: requestUser.id } });
    if (dbUser && dbUser.role === 'admin') {
      if (dbUser.isMainAdmin) return true;
      const dbEmail = (dbUser.email || '').toLowerCase();
      if (adminEmails.includes(dbEmail)) return true;

      // Check if user has restricted permissions
      let perms = dbUser.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (_) {}
      }
      const permArr = Array.isArray(perms) ? perms : [];
      if (permArr.length === 0) return true;
    }
  }

  // Fallback: If user role is admin and has no restricted permissions array
  let perms = requestUser.permissions;
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch (_) {}
  }
  const permArr = Array.isArray(perms) ? perms : [];
  if (permArr.length === 0) return true;

  return false;
}

export async function getAll(request: any, reply: any) {
  try {
    const user = request.user;
    const isAllowed = await isMainAdminUser(user);
    if (!isAllowed) {
      return reply.status(403).send({ error: 'Forbidden: Only Main Admin can manage Sub-Admins' });
    }
    const data = await subAdminService.getAllSubAdmins();
    return reply.status(200).send({ data });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function create(request: any, reply: any) {
  try {
    const user = request.user;
    const isAllowed = await isMainAdminUser(user);
    if (!isAllowed) {
      return reply.status(403).send({ error: 'Forbidden: Only Main Admin can create Sub-Admins' });
    }
    const data = await subAdminService.createSubAdmin(request.body);
    return reply.status(201).send({ data });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function update(request: any, reply: any) {
  try {
    const user = request.user;
    const isAllowed = await isMainAdminUser(user);
    if (!isAllowed) {
      return reply.status(403).send({ error: 'Forbidden: Only Main Admin can update Sub-Admins' });
    }
    const data = await subAdminService.updateSubAdmin(request.params.id, request.body);
    return reply.status(200).send({ data });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function deleteSubAdmin(request: any, reply: any) {
  try {
    const user = request.user;
    const isAllowed = await isMainAdminUser(user);
    if (!isAllowed) {
      return reply.status(403).send({ error: 'Forbidden: Only Main Admin can delete Sub-Admins' });
    }
    await subAdminService.deleteSubAdmin(request.params.id);
    return reply.status(200).send({ message: 'Sub-Admin deleted successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
