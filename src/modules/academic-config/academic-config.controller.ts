import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../prisma';

export class AcademicConfigController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as any;

      // Delete all existing configs to ensure singleton
      await prisma.academicConfig.deleteMany({});

      const breaks = typeof data.breaks === 'object' ? JSON.stringify(data.breaks) : (data.breaks || '[]');
      const workingDays = typeof data.workingDays === 'object' ? JSON.stringify(data.workingDays) : (data.workingDays || '[]');

      const config = await prisma.academicConfig.create({
        data: {
          academicYear: data.academicYear || '2026-2027',
          startTime: data.startTime || '08:00',
          endTime: data.endTime || '14:00',
          periodDuration: parseInt(data.periodDuration) || 40,
          periodsPerDay: parseInt(data.periodsPerDay) || 8,
          daysPerWeek: parseInt(data.daysPerWeek) || 6,
          breaks,
          workingDays,
          timetableActive: data.timetableActive || false,
          schoolName: data.schoolName || null,
          schoolAddress: data.schoolAddress || null,
          schoolPhone: data.schoolPhone || null,
          schoolEmail: data.schoolEmail || null,
          schoolLogo: data.schoolLogo || null,
        },
      });

      return reply.code(200).send({ success: true, ...config });
    } catch (error) {
      console.error('FAILED TO SAVE CONFIG:', error);
      return reply.code(500).send({ success: false, message: 'Failed to save configuration' });
    }
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = await prisma.academicConfig.findFirst();

      if (!config) {
        return reply.code(200).send({});
      }

      let breakTimings = [];
      try { if (config.breaks) breakTimings = JSON.parse(config.breaks); } catch (e) {}

      let workingDaysList = [];
      try { if (config.workingDays) workingDaysList = JSON.parse(config.workingDays); } catch (e) {}

      return reply.code(200).send({
        ...config,
        breakTimings,
        workingDays: workingDaysList,
      });
    } catch (error) {
      console.error('Config fetch error:', error);
      return reply.code(500).send({ message: 'Failed to fetch configuration' });
    }
  }
}
