import * as studentService from './student.service';

export async function getAll(request: any, reply: any) {
  try {
    const students = await studentService.getAllStudents(request.query);
    return reply.status(200).send({ data: students });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const student = await studentService.getStudentById(request.params.id);
    if (!student) return reply.status(404).send({ error: 'Student not found' });
    return reply.status(200).send({ data: student });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function create(request: any, reply: any) {
  try {
    const student = await studentService.createStudent(request.body);
    return reply.status(201).send({ data: student });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function update(request: any, reply: any) {
  try {
    const student = await studentService.updateStudent(request.params.id, request.body);
    return reply.status(200).send({ data: student });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function updateStatus(request: any, reply: any) {
  try {
    const { status } = request.body;
    await studentService.updateStudentStatus(request.params.id, status);
    return reply.status(200).send({ message: 'Status updated successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getParents(request: any, reply: any) {
  try {
    const parents = await studentService.getStudentParents(request.params.id);
    return reply.status(200).send({ data: parents });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
