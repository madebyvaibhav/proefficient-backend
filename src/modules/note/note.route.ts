import { FastifyInstance } from 'fastify';
import * as noteController from './note.controller';

export default async function (app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get('/', auth, noteController.getAll);
  app.get('/:id', auth, noteController.getById);
  app.post('/', auth, noteController.upload);
  app.delete('/:id', auth, noteController.deleteNote);
}
