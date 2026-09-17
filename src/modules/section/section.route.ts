import { FastifyInstance } from 'fastify';
import * as SectionController from './section.controller';

export default async function (app: FastifyInstance) {
  app.get('/', SectionController.getAll);
  app.get('/:id', SectionController.getById);
  app.post('/', { onRequest: [(app as any).authenticate] }, SectionController.create);
  app.patch('/:id', { onRequest: [(app as any).authenticate] }, SectionController.update);
  app.delete('/:id', { onRequest: [(app as any).authenticate] }, SectionController.deleteSection);
  app.get('/:id/students', SectionController.getStudents);
}
