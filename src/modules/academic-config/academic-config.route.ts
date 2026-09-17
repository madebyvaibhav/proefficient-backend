import { FastifyInstance } from 'fastify';
import { AcademicConfigController } from './academic-config.controller';

const controller = new AcademicConfigController();

async function academicConfigRoutes(fastify: FastifyInstance) {
    console.log('[ROUTE] Registering academic config routes at /api/config');
    fastify.post('/', controller.create.bind(controller));
    fastify.get('/', controller.get.bind(controller));
    console.log('[ROUTE] Academic config routes registered successfully');
}

export default academicConfigRoutes;
