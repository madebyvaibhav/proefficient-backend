import * as remarkService from './remark.service';
import { RemarkType } from '@prisma/client';

export async function getAll(request: any, reply: any) {
  try {
    const { classId, teacherId, type } = request.query;
    const data = await remarkService.getAllRemarks(classId, teacherId, type as RemarkType);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const data = await remarkService.getRemarkById(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Remark not found' });
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function create(request: any, reply: any) {
  try {
    const { studentId, teacherId, type, content, isVisibleToParent } = request.body;
    if (!studentId || !teacherId || !type || !content) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    const data = await remarkService.createRemark({ studentId, teacherId, type, content, isVisibleToParent: isVisibleToParent ?? true });
    reply.status(201).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function update(request: any, reply: any) {
  try {
    const data = await remarkService.updateRemark(request.params.id, request.body);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function deleteRemark(request: any, reply: any) {
  try {
    await remarkService.deleteRemark(request.params.id);
    reply.status(200).send({ message: 'Deleted successfully' });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getStudentRemarks(request: any, reply: any) {
  try {
    const data = await remarkService.getStudentRemarks(request.params.studentId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}
