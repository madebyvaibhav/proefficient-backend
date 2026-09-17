import { FastifyInstance } from 'fastify';
import { RoomController } from './room.controller';

const roomController = new RoomController();

async function roomRoutes(fastify: FastifyInstance) {
    fastify.get('/', roomController.getAll);
    fastify.post('/', roomController.create);
    fastify.put('/:id', roomController.update);
    fastify.delete('/:id', roomController.delete);
}

export default roomRoutes;
