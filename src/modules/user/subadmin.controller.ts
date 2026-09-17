import * as subAdminService from './subadmin.service';
import { prisma } from '../../prisma';

async function isMainAdminUser(requestUser: any): Promise<boolean> {
  if (!requestUser) return false;
  if (requestUser.isMainAdmin === true) return true;
  if (requestUser.email === 'admin@gmail.com' || requestUser.email === 'admin@proefficient.edu') return true;

  if (requestUser.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: requestUser.id } });
    if (dbUser && dbUser.role === 'admin' && (dbUser.isMainAdmin || dbUser.email === 'admin@gmail.com' || dbUser.email === 'admin@proefficient.edu')) {
      return true;
    }
  }
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
