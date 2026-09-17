import { FastifyInstance } from 'fastify';
import { NoticeController } from './notices.controller';

const noticeController = new NoticeController();

async function noticeRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.get('/', noticeController.getAll);
  fastify.get('/admin', noticeController.getAdmin);
  fastify.get('/teacher', noticeController.getTeacher);
  fastify.get('/search', noticeController.search);
  fastify.get('/class/:classId', noticeController.getByClass);
  fastify.get('/class/:classId/section/:sectionId', noticeController.getByClassAndSection);
  fastify.get('/role/:role', noticeController.getByRole);
  fastify.get('/visibility/:visibility', noticeController.getByVisibility);
  fastify.get('/:id', noticeController.getById);

  // Protected routes
  fastify.post('/', { onRequest: [(fastify as any).authenticate] }, noticeController.create);
  fastify.put('/:id', { onRequest: [(fastify as any).authenticate] }, noticeController.update);
  fastify.delete('/:id', { onRequest: [(fastify as any).authenticate] }, noticeController.delete);
}

export default noticeRoutes;
