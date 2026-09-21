import * as teacherService from './teacher.service';

export async function getAll(request: any, reply: any) {
  try {
    const teachers = await teacherService.getAllTeachers(request.query);
    return reply.status(200).send({ data: teachers });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const teacher = await teacherService.getTeacherById(request.params.id);
    if (!teacher) return reply.status(404).send({ error: 'Teacher not found' });
    return reply.status(200).send({ data: teacher });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function create(request: any, reply: any) {
  try {
    const teacher = await teacherService.createTeacher(request.body);
    return reply.status(201).send({ data: teacher });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function update(request: any, reply: any) {
  try {
    const teacher = await teacherService.updateTeacher(request.params.id, request.body);
    return reply.status(200).send({ data: teacher });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateStatus(request: any, reply: any) {
  try {
    const { status } = request.body;
    await teacherService.updateTeacherStatus(request.params.id, status);
    return reply.status(200).send({ message: 'Status updated successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function remove(request: any, reply: any) {
  try {
    await teacherService.deleteTeacher(request.params.id);
    return reply.status(200).send({ message: 'Teacher deleted successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
