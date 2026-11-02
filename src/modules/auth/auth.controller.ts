import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await authService.register(request.body);
      reply.code(201).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await authService.login(request.body, request.server);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(401).send({ message: error.message });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      if (!refreshToken) return reply.code(400).send({ message: 'Refresh token is required' });
      const data = await authService.refreshToken(refreshToken, request.server);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(401).send({ message: error.message });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { refreshToken } = (request.body || {}) as { refreshToken?: string };
      const data = await authService.logout(user.id, refreshToken);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const data = await authService.getMe(user.id);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async registerFCMToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { token } = request.body as { token: string };
      if (!token) return reply.code(400).send({ message: 'FCM token is required' });
      const data = await authService.registerFCMToken(user.id, token);
      console.log(`[FCM] Registered push token for user ${user?.id} (${user?.email || user?.role}): ${token.substring(0, 30)}...`);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      if (!user || !user.id) return reply.code(401).send({ message: 'Unauthorized' });
      const data = await authService.changePassword(user.id, request.body);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, identifier } = (request.body as any) || {};
      const key = (identifier || email || '').trim();
      if (!key) return reply.code(400).send({ message: 'Email, Mobile, or Roll Number is required' });
      const data = await authService.forgotPassword(key);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async adminFindUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ message: 'Only administrators can perform this action' });
      }
      const { identifier } = (request.query as any) || (request.body as any) || {};
      if (!identifier) return reply.code(400).send({ message: 'User ID or identifier is required' });

      const data = await authService.findUserByIdentifier(identifier);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }

  async adminResetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ message: 'Only administrators can reset user passwords' });
      }
      const { identifier, newPassword } = (request.body as any) || {};
      if (!identifier) return reply.code(400).send({ message: 'User ID or identifier is required' });

      const data = await authService.adminResetUserPassword(identifier, newPassword);
      reply.code(200).send(data);
    } catch (error: any) {
      reply.code(400).send({ message: error.message });
    }
  }
}
