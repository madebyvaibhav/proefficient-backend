import { FastifyInstance } from 'fastify';
import * as syllabusController from './syllabus.controller';

export default async function syllabusRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  app.get('/', auth, syllabusController.getSyllabus);
  app.get('/summary', auth, syllabusController.getSummary);
  app.post('/', auth, syllabusController.createPlan);
  app.post('/item', auth, syllabusController.addTopic);
  app.patch('/item/:id', auth, syllabusController.updateTopicStatus);
  app.delete('/item/:id', auth, syllabusController.deleteTopic);
  app.delete('/:id', auth, syllabusController.deletePlan);
}
