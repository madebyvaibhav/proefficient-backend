import { FastifyInstance } from 'fastify';
import { ConstraintsController } from './constraints.controller';

const controller = new ConstraintsController();

async function constraintsRoutes(fastify: FastifyInstance) {
    fastify.get('/', controller.getConstraints.bind(controller));
    fastify.post('/', controller.saveConstraints.bind(controller));
}

export default constraintsRoutes;
