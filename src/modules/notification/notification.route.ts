import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma';

async function createNotification(userId: string, title: string, body: string, type: string) {
  return prisma.notification.create({
    data: { userId, title, body, type },
  });
}

async function notifyParentsOfStudent(studentId: string, title: string, body: string, type: string) {
  const links = await prisma.parentStudent.findMany({ where: { studentId } });
  for (const link of links) {
    await createNotification(link.parentId, title, body, type);
  }
}

export async function getAll(request: any, reply: any) {
  try {
    const userId = request.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    reply.send({ notifications, unreadCount });
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function markRead(request: any, reply: any) {
  try {
    const { id } = request.params;
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    reply.send({ message: 'Marked as read' });
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function markAllRead(request: any, reply: any) {
  try {
    const userId = request.user.id;
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    reply.send({ message: 'All notifications marked as read' });
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

async function notificationRoutes(app: FastifyInstance) {
  app.get('/', { onRequest: [(app as any).authenticate] }, getAll);
  app.patch('/:id/read', { onRequest: [(app as any).authenticate] }, markRead);
  app.patch('/read-all', { onRequest: [(app as any).authenticate] }, markAllRead);
}

export { createNotification, notifyParentsOfStudent };
export default notificationRoutes;
