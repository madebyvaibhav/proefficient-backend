import { FastifyInstance } from 'fastify';

async function teacherRoutes(fastify: FastifyInstance) {
    fastify.get('/', async (request, reply) => {
        return { role: 'teacher' };
    });
}

export default teacherRoutes;
