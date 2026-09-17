import { FastifyReply, FastifyRequest } from 'fastify';
import { NoticeService } from './notices.service';

const noticeService = new NoticeService();

export class NoticeController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const body = request.body as any;
      const data = await noticeService.createNotice({
        ...body,
        authorId: user?.id,
        senderRole: user?.role || 'admin',
      });
      reply.code(201).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      let userRole = (request as any).user?.role || (request.query as any)?.role;
      if (!userRole && request.headers.authorization) {
        try {
          await (request as any).jwtVerify();
          userRole = (request as any).user?.role;
        } catch {
          // Token verification failed or absent
        }
      }
      const data = await noticeService.getNotices(userRole);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const data = await noticeService.getNoticeById(request.params.id);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(404).send({ message: error.message });
    }
  }

  async getByClass(
    request: FastifyRequest<{ Params: { classId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const data = await noticeService.getNoticesByClass(request.params.classId);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getByRole(request: FastifyRequest<{ Params: { role: string } }>, reply: FastifyReply) {
    try {
      const data = await noticeService.getNoticesByRole(request.params.role);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getByClassAndSection(
    request: FastifyRequest<{ Params: { classId: string; sectionId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const data = await noticeService.getNoticesByClassAndSection(
        request.params.classId,
        request.params.sectionId
      );
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await noticeService.getAdminNotices();
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getTeacher(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await noticeService.getTeacherNotices();
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const data = await noticeService.updateNotice(request.params.id, request.body);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await noticeService.deleteNotice(request.params.id);
      reply.code(204).send();
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async getByVisibility(request: FastifyRequest<{ Params: { visibility: string } }>, reply: FastifyReply) {
    try {
      const data = await noticeService.getNoticesByVisibility(request.params.visibility);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }

  async search(request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) {
    try {
      const data = await noticeService.searchNotices(request.query.q);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(500).send({ message: error.message });
    }
  }
}
