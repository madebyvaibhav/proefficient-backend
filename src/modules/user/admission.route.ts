import { FastifyInstance } from 'fastify';
import { enrollStudent, getAdmissionHistory, updateStudentAdmission } from './admission.controller';

export default async function (app: FastifyInstance) {
  const adminOrSubAdmin = { preHandler: [(app as any).authorize(['admin', 'subadmin'])] };
  app.post('/', adminOrSubAdmin, enrollStudent);
  app.get('/history', adminOrSubAdmin, getAdmissionHistory);
  app.patch('/:id', adminOrSubAdmin, updateStudentAdmission);
  app.put('/:id', adminOrSubAdmin, updateStudentAdmission);
}
