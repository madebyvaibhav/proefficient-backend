import { FastifyInstance } from 'fastify';

async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return { role: 'admin' };
  });
}

export default adminRoutes;
