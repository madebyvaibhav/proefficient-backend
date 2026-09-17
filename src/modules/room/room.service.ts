import { prisma } from '../../prisma';

export class RoomService {
  async createRoom(data: any) {
    const { id, ...createData } = data;
    return prisma.room.create({ data: createData });
  }

  async getRooms() {
    return prisma.room.findMany({ orderBy: { number: 'asc' } });
  }

  async getRoomById(id: string) {
    return prisma.room.findUnique({ where: { id } });
  }

  async getRoomByNumber(number: string) {
    return prisma.room.findUnique({ where: { number } });
  }

  async getRoomsByType(type: string) {
    return prisma.room.findMany({ where: { type } });
  }

  async updateRoom(id: string, data: any) {
    const { id: _, ...updateData } = data;
    return prisma.room.update({ where: { id }, data: updateData });
  }

  async deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
  }
}
