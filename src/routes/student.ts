import { FastifyInstance } from 'fastify';

async function studentRoutes(fastify: FastifyInstance) {
    fastify.get('/', async (request, reply) => {
        return { role: 'student' };
    });
}

export default studentRoutes;
