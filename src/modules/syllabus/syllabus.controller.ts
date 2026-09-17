import * as syllabusService from './syllabus.service';
import { prisma } from '../../prisma';

export async function getSyllabus(request: any, reply: any) {
  try {
    let { teacherId, subjectId } = request.query as {
      teacherId?: string;
      subjectId?: string;
    };

    // If teacher role, default to current teacher's profile
    if (request.user?.role === 'teacher' && !teacherId) {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId: request.user.id },
      });
      if (tp) teacherId = tp.id;
    }

    const plans = await syllabusService.getSyllabusPlans({ teacherId, subjectId });
    reply.status(200).send(plans);
  } catch (error: any) {
    console.error('getSyllabus error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function getSummary(request: any, reply: any) {
  try {
    const summary = await syllabusService.getSyllabusSummary();
    reply.status(200).send(summary);
  } catch (error: any) {
    console.error('getSummary error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function createPlan(request: any, reply: any) {
  try {
    let { subjectId, teacherId, classId, sectionId, academicYear, chapter, topics, startDate, endDate } = request.body || {};

    if (request.user?.role === 'teacher' && !teacherId) {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId: request.user.id },
      });
      if (tp) teacherId = tp.id;
    }

    if (!subjectId || !teacherId || !chapter || !topics || !topics.length) {
      return reply.status(400).send({
        error: 'Missing required fields: subjectId, teacherId, chapter, topics',
      });
    }

    const result = await syllabusService.createSyllabusPlan({
      subjectId,
      teacherId,
      classId,
      sectionId,
      academicYear,
      chapter,
      topics,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    reply.status(201).send(result);
  } catch (error: any) {
    console.error('createPlan error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function addTopic(request: any, reply: any) {
  try {
    const { lecturePlanId, chapter, topic, date, day, startTime, endTime, homework, notes, status } = request.body || {};

    if (!lecturePlanId || !chapter || !topic) {
      return reply.status(400).send({
        error: 'Missing required fields: lecturePlanId, chapter, topic',
      });
    }

    const item = await syllabusService.addSyllabusTopic({
      lecturePlanId,
      chapter,
      topic,
      date: date ? new Date(date) : undefined,
      day,
      startTime,
      endTime,
      homework,
      notes,
      status,
    });

    reply.status(201).send(item);
  } catch (error: any) {
    console.error('addTopic error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function updateTopicStatus(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { status, topic, chapter, date, day, startTime, endTime, homework, notes } = request.body || {};

    if (!id) {
      return reply.status(400).send({ error: 'Topic ID is required' });
    }

    const updated = await syllabusService.updateSyllabusTopicStatus(id, {
      status,
      topic,
      chapter,
      date: date ? new Date(date) : undefined,
      day,
      startTime,
      endTime,
      homework,
      notes,
    });

    reply.status(200).send(updated);
  } catch (error: any) {
    console.error('updateTopicStatus error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function deleteTopic(request: any, reply: any) {
  try {
    const { id } = request.params;
    await syllabusService.deleteSyllabusTopic(id);
    reply.status(200).send({ message: 'Topic deleted successfully' });
  } catch (error: any) {
    console.error('deleteTopic error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function deletePlan(request: any, reply: any) {
  try {
    const { id } = request.params;
    await syllabusService.deleteSyllabusPlan(id);
    reply.status(200).send({ message: 'Plan deleted successfully' });
  } catch (error: any) {
    console.error('deletePlan error:', error);
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}
