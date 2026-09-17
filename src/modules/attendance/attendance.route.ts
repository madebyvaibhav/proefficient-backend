import { FastifyInstance } from 'fastify';
import { startLecture, markAttendance, endLecture, getStudentSummary, getSectionLectures, getTrend, dispatchStudents, markDoubtSession, getLectureDispatchStatus, getAttendanceHistory, getLectureDetails } from './attendance.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };
  const teacherOrAdmin = { preHandler: [(app as any).authorize(['admin', 'teacher'])] };

  app.post('/lectures/start', teacherOrAdmin, startLecture);
  app.get('/lectures/:id', teacherOrAdmin, getLectureDetails);
  app.post('/lectures/:id/mark', teacherOrAdmin, markAttendance);
  app.patch('/lectures/:id/end', teacherOrAdmin, endLecture);
  app.get('/students/:studentId/summary', auth, getStudentSummary);
  app.get('/history', teacherOrAdmin, getAttendanceHistory);
  app.get('/sections/:sectionId/lectures', teacherOrAdmin, getSectionLectures);
  app.get('/trend', teacherOrAdmin, getTrend);
  app.post('/lectures/:id/dispatch', teacherOrAdmin, dispatchStudents);
  app.post('/lectures/:id/doubts', teacherOrAdmin, markDoubtSession);
  app.get('/lectures/:id/dispatch-status', teacherOrAdmin, getLectureDispatchStatus);
}
