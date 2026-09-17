import { FastifyInstance } from 'fastify';
import { enrollStudent, getAdmissionHistory } from './admission.controller';

export default async function (app: FastifyInstance) {
  const adminOnly = { preHandler: [(app as any).authorize(['admin'])] };
  app.post('/', adminOnly, enrollStudent);
  app.get('/history', adminOnly, getAdmissionHistory);
}
