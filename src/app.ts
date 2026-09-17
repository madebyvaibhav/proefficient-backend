import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';

// Route imports
import authRoutes from './modules/auth/auth.route';
import classRoutes from './modules/class/class.route';
import sectionRoutes from './modules/section/section.route';
import subjectRoutes from './modules/subject/subject.route';
import teacherRoutes from './modules/user/teacher.route';
import studentRoutes from './modules/user/student.route';
import parentRoutes from './modules/user/parent.route';
import admissionRoutes from './modules/user/admission.route';
import subAdminRoutes from './modules/user/subadmin.route';
import roomRoutes from './modules/room/room.route';
import attendanceRoutes from './modules/attendance/attendance.route';
import timetableRoutes from './modules/timetable/timetable.route';
import feeRoutes from './modules/fee/fee.route';
import testRoutes from './modules/test/test.route';
import remarkRoutes from './modules/remark/remark.route';
import noteRoutes from './modules/note/note.route';
import notificationRoutes from './modules/notification/notification.route';
import dashboardRoutes from './modules/dashboard/dashboard.route';
import reportRoutes from './modules/report/report.route';
import noticesRoutes from './modules/notices/notices.route';
import academicConfigRoutes from './modules/academic-config/academic-config.route';
import constraintsRoutes from './modules/academic-config/constraints.route';
import syllabusRoutes from './modules/syllabus/syllabus.route';

const app = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
  bodyLimit: 52428800, // 50MB body limit for base64 photo/document attachments
});

// Request Logging
app.addHook('onRequest', async (request, reply) => {
  console.log(`[DEBUG] ${request.method} ${request.url}`);
});

// ─── Security & Plugins ─────────────────────────────────────

app.register(cors, { origin: true, credentials: true });

app.register(helmet, { contentSecurityPolicy: false });

app.register(rateLimit, {
  max: 2000,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1', 'localhost'],
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecretkey-change-in-production',
});

app.register(import('@fastify/multipart'), {
  limits: { fileSize: 20971520 }, // 20MB
});

// Serve uploaded files
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false,
});

// ─── Auth Decorators ────────────────────────────────────────

app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.code(401).send({ message: 'Unauthorized' });
  }
});

app.decorate('authorize', function (roles: string[]) {
  return async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
      const userRole = String(request.user?.role || '').toLowerCase();
      const normalizedRoles = roles.map((r: string) => String(r).toLowerCase());
      if (!normalizedRoles.includes(userRole)) {
        return reply.code(403).send({ message: 'Forbidden: insufficient permissions' });
      }
    } catch (error) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  };
});

// ─── Root Routes ────────────────────────────────────────────

app.get('/', async () => ({
  status: 'ok',
  message: 'Proefficient Institute of Learning ERP Backend is Running!',
}));

app.get('/health', async () => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
}));

// ─── API Routes (v1) ────────────────────────────────────────

// Auth
app.register(authRoutes, { prefix: '/v1/auth' });
// Also keep legacy /api/auth for backward compatibility during migration
app.register(authRoutes, { prefix: '/api/auth' });

// Academic structure
app.register(classRoutes, { prefix: '/v1/classes' });
app.register(sectionRoutes, { prefix: '/v1/sections' });
app.register(subjectRoutes, { prefix: '/v1/subjects' });
app.register(roomRoutes, { prefix: '/v1/rooms' });
app.register(timetableRoutes, { prefix: '/v1/timetable' });

// People
app.register(studentRoutes, { prefix: '/v1/students' });
app.register(admissionRoutes, { prefix: '/v1/students/admission' });
app.register(teacherRoutes, { prefix: '/v1/teachers' });
app.register(parentRoutes, { prefix: '/v1/parents' });
app.register(subAdminRoutes, { prefix: '/v1/sub-admins' });
app.register(subAdminRoutes, { prefix: '/v1/users/sub-admins' });

// Features
app.register(attendanceRoutes, { prefix: '/v1/attendance' });
app.register(feeRoutes, { prefix: '/v1/fees' });
app.register(testRoutes, { prefix: '/v1/tests' });
app.register(remarkRoutes, { prefix: '/v1/remarks' });
app.register(noteRoutes, { prefix: '/v1/notes' });
app.register(noticesRoutes, { prefix: '/v1/notices' });

// System
app.register(notificationRoutes, { prefix: '/v1/notifications' });
app.register(dashboardRoutes, { prefix: '/v1/dashboard' });
app.register(reportRoutes, { prefix: '/v1/reports' });
app.register(syllabusRoutes, { prefix: '/v1/syllabus' });
app.register(academicConfigRoutes, { prefix: '/v1/config' });
app.register(constraintsRoutes, { prefix: '/v1/config/constraints' });

// Legacy routes (backward compatibility)
app.register(studentRoutes, { prefix: '/api/students' });
app.register(teacherRoutes, { prefix: '/api/teachers' });
app.register(subjectRoutes, { prefix: '/api/subjects' });
app.register(roomRoutes, { prefix: '/api/rooms' });
app.register(noticesRoutes, { prefix: '/api/notices' });
app.register(timetableRoutes, { prefix: '/api/timetable' });
app.register(academicConfigRoutes, { prefix: '/api/config' });
app.register(constraintsRoutes, { prefix: '/api/config/constraints' });

// ─── Error Handling ─────────────────────────────────────────

app.setErrorHandler((error: any, request, reply) => {
  app.log.error(error);
  reply.code(error.statusCode || 500).send({
    message: error.message || 'Internal Server Error',
    statusCode: error.statusCode || 500,
  });
});

app.setNotFoundHandler((request, reply) => {
  console.log(`[404] Route not found: ${request.method} ${request.url}`);
  reply.code(404).send({ message: 'Route not found', statusCode: 404 });
});

export default app;
