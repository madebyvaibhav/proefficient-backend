import { FastifyInstance } from 'fastify';
import * as SubjectController from './subject.controller';

export default async function (app: FastifyInstance) {
  app.get('/', SubjectController.getAll);
  app.get('/:id', SubjectController.getById);
  app.post('/', { onRequest: [(app as any).authenticate] }, SubjectController.create);
  app.patch('/:id', { onRequest: [(app as any).authenticate] }, SubjectController.update);
  app.delete('/:id', { onRequest: [(app as any).authenticate] }, SubjectController.deleteSubject);
}
