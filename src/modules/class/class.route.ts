import { FastifyInstance } from 'fastify';
import * as ClassController from './class.controller';

export default async function (app: FastifyInstance) {
  const adminOnly = { onRequest: [(app as any).authorize(['admin'])] };

  // Assignments (MUST be above /:id to avoid route collision)
  app.get('/assignments', ClassController.getAssignments);
  app.post('/assign', adminOnly, ClassController.assignTeacher);
  app.delete('/assignments/:id', adminOnly, ClassController.deleteAssignment);

  // Classes
  app.get('/', ClassController.getAll);
  app.get('/:id', ClassController.getById);
  app.post('/', adminOnly, ClassController.create);
  app.patch('/:id', adminOnly, ClassController.update);
  app.get('/:id/students', ClassController.getStudents);
  app.post('/:id/subjects', adminOnly, ClassController.assignSubjects);
}
