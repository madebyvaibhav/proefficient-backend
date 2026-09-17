import * as SubjectService from './subject.service';

export const getAll = async (request: any, reply: any) => {
  try {
    const { classId } = request.query || {};
    const subjects = await SubjectService.getAllSubjects(classId);
    return reply.status(200).send(subjects);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const getById = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const subject = await SubjectService.getSubjectById(id);
    if (!subject) return reply.status(404).send({ error: 'Not Found' });
    return reply.status(200).send(subject);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const create = async (request: any, reply: any) => {
  try {
    const subject = await SubjectService.createSubject(request.body);
    return reply.status(201).send(subject);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};

export const update = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const subject = await SubjectService.updateSubject(id, request.body);
    return reply.status(200).send(subject);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};

export const deleteSubject = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    await SubjectService.deleteSubject(id);
    return reply.status(200).send({ success: true });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};
