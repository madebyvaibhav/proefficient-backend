import { FastifyInstance } from 'fastify';
import * as testController from './test.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get('/', auth, testController.getAll);
  app.get('/:id', auth, testController.getById);
  app.post('/', auth, testController.create);
  app.patch('/:id', auth, testController.update);
  app.delete('/:id', auth, testController.deleteTest);
  app.post('/:id/marks', auth, testController.bulkEnterMarks);
  app.get('/:id/results', auth, testController.getResults);
  app.get('/students/:studentId/summary', auth, testController.getStudentSummary);
}
