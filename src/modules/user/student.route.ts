import { FastifyInstance } from 'fastify';
import { getAll, getById, create, update, updateStatus, getParents } from './student.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };
  const adminOnly = { preHandler: [(app as any).authorize(['admin'])] };

  app.get('/', auth, getAll);
  app.get('/:id', auth, getById);
  app.post('/', adminOnly, create);
  app.patch('/:id', adminOnly, update);
  app.patch('/:id/status', adminOnly, updateStatus);
  app.get('/:id/parents', auth, getParents);
}
