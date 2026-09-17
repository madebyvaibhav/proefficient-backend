import * as SectionService from './section.service';

export const getAll = async (request: any, reply: any) => {
  try {
    const { classId } = request.query;
    const sections = await SectionService.getAllSections(classId);
    return reply.status(200).send(sections);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const getById = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const section = await SectionService.getSectionById(id);
    if (!section) return reply.status(404).send({ error: 'Not Found' });
    return reply.status(200).send(section);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const create = async (request: any, reply: any) => {
  try {
    const section = await SectionService.createSection(request.body);
    return reply.status(201).send(section);
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

export const update = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const section = await SectionService.updateSection(id, request.body);
    return reply.status(200).send(section);
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

export const deleteSection = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    await SectionService.deleteSection(id);
    return reply.status(200).send({ success: true });
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

export const getStudents = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const students = await SectionService.getSectionStudents(id);
    return reply.status(200).send(students);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};
