import { FastifyInstance } from 'fastify';
import * as subAdminController from './subadmin.controller';

export default async function (fastify: FastifyInstance) {
  const adminOnly = { preHandler: [(fastify as any).authorize(['admin'])] };

  fastify.get('/', adminOnly, subAdminController.getAll);
  fastify.post('/', adminOnly, subAdminController.create);
  fastify.patch('/:id', adminOnly, subAdminController.update);
  fastify.delete('/:id', adminOnly, subAdminController.deleteSubAdmin);
}
