import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

const authController = new AuthController();

async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', authController.login);
  fastify.post('/register', authController.register);
  fastify.post('/refresh', authController.refresh);
  fastify.post('/logout', {
    onRequest: [(fastify as any).authenticate],
  }, authController.logout);
  fastify.get('/me', {
    onRequest: [(fastify as any).authenticate],
  }, authController.getMe);
  fastify.post('/fcm-token', {
    onRequest: [(fastify as any).authenticate],
  }, authController.registerFCMToken);
  fastify.patch('/change-password', {
    onRequest: [(fastify as any).authenticate],
  }, authController.changePassword);
  fastify.post('/forgot-password', authController.forgotPassword);
}

export default authRoutes;
