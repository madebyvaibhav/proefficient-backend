import { FastifyInstance } from 'fastify';
import * as feeController from './fee.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };
  const adminOnly = { preHandler: [(app as any).authorize(['admin'])] };
  
  app.get('/', auth, feeController.getAll);
  app.get('/:id', auth, feeController.getById);
  app.post('/', adminOnly, feeController.create);
  app.post('/bulk-class', adminOnly, feeController.bulkCreateForClass);
  app.post('/:id/payments', adminOnly, feeController.recordPayment);
  app.post('/:id/status', adminOnly, feeController.markStatus);
  app.post('/:id/remind', adminOnly, feeController.sendReminder);
  app.post('/student-remind', adminOnly, feeController.sendStudentReminder);
  app.post('/bulk-remind', adminOnly, feeController.sendBulkReminders);
  app.get('/students/:studentId/summary', auth, feeController.getStudentSummary);
  app.patch('/:id', adminOnly, feeController.update);
  app.delete('/:id', adminOnly, feeController.deleteFee);
}
