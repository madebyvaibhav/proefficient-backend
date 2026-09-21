import * as ClassService from './class.service';

export const getAll = async (request: any, reply: any) => {
  try {
    const classes = await ClassService.getAllClasses();
    return reply.status(200).send(classes);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const getById = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const classData = await ClassService.getClassById(id);
    if (!classData) return reply.status(404).send({ error: 'Not Found' });
    return reply.status(200).send(classData);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const create = async (request: any, reply: any) => {
  try {
    const newClass = await ClassService.createClass(request.body);
    return reply.status(201).send(newClass);
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

export const update = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const updatedClass = await ClassService.updateClass(id, request.body);
    return reply.status(200).send(updatedClass);
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

export const remove = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    await ClassService.deleteClass(id);
    return reply.status(200).send({ message: 'Class deleted successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};

export const getStudents = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const students = await ClassService.getClassStudents(id);
    return reply.status(200).send(students);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const assignSubjects = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    const result = await ClassService.assignSubjects(id, request.body);
    return reply.status(201).send(result);
  } catch (error) {
    return reply.status(400).send({ error: 'Bad Request' });
  }
};

// ── Assignments Handlers ──
export const getAssignments = async (request: any, reply: any) => {
  try {
    const assignments = await ClassService.getAllAssignments();
    return reply.status(200).send(assignments);
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const assignTeacher = async (request: any, reply: any) => {
  try {
    const assignment = await ClassService.assignTeacherToSubject(request.body);
    return reply.status(200).send(assignment);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};

export const deleteAssignment = async (request: any, reply: any) => {
  try {
    const { id } = request.params;
    await ClassService.removeAssignment(id);
    return reply.status(200).send({ message: 'Assignment removed successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Bad Request' });
  }
};
