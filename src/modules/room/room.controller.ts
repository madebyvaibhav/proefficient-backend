import { FastifyReply, FastifyRequest } from 'fastify';
import { RoomService } from './room.service';

const roomService = new RoomService();

export class RoomController {
    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = await roomService.createRoom(request.body);
            reply.code(201).send(data);
        } catch (error: any) {
            reply.code(500).send({ message: error.message });
        }
    }

    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = await roomService.getRooms();
            reply.code(200).send(data);
        } catch (error: any) {
            reply.code(500).send({ message: error.message });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const data = await roomService.updateRoom(request.params.id, request.body);
            reply.code(200).send(data);
        } catch (error: any) {
            reply.code(500).send({ message: error.message });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            await roomService.deleteRoom(request.params.id);
            reply.code(204).send();
        } catch (error: any) {
            reply.code(500).send({ message: error.message });
        }
    }
}
