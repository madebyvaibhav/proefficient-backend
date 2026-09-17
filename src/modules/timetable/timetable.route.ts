import { FastifyInstance } from 'fastify';
import { getSectionTimetable, create, update, deleteEntry, getMySchedule, getStudentSchedule, bulkCreate, clearSection } from './timetable.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };
  const adminOnly = { preHandler: [(app as any).authorize(['admin'])] };
  const teacherOrAdmin = { preHandler: [(app as any).authorize(['admin', 'teacher'])] };

  app.get('/sections/:sectionId', auth, getSectionTimetable);
  app.post('/', adminOnly, create);
  app.patch('/:id', adminOnly, update);
  app.delete('/sections/:sectionId/clear', adminOnly, clearSection);
  app.delete('/:id', adminOnly, deleteEntry);
  app.get('/my-schedule', teacherOrAdmin, getMySchedule);
  app.get('/student-schedule', auth, getStudentSchedule);
  app.post('/bulk', adminOnly, bulkCreate);
}
