import { FastifyInstance } from 'fastify';
import * as remarkController from './remark.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get('/', auth, remarkController.getAll);
  app.get('/:id', auth, remarkController.getById);
  app.post('/', auth, remarkController.create);
  app.patch('/:id', auth, remarkController.update);
  app.delete('/:id', auth, remarkController.deleteRemark);
  app.get('/students/:studentId', auth, remarkController.getStudentRemarks);
}
