import * as parentService from './parent.service';

export async function getAll(request: any, reply: any) {
  try {
    const parents = await parentService.getAllParents();
    return reply.status(200).send({ data: parents });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const parent = await parentService.getParentById(request.params.id);
    if (!parent) return reply.status(404).send({ error: 'Parent not found' });
    return reply.status(200).send({ data: parent });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function create(request: any, reply: any) {
  try {
    const parent = await parentService.createParent(request.body);
    return reply.status(201).send({ data: parent });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function update(request: any, reply: any) {
  try {
    const parent = await parentService.updateParent(request.params.id, request.body);
    return reply.status(200).send({ data: parent });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function linkStudent(request: any, reply: any) {
  try {
    const link = await parentService.linkStudent(request.body);
    return reply.status(201).send({ data: link });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function unlinkStudent(request: any, reply: any) {
  try {
    await parentService.unlinkStudent(request.params.id);
    return reply.status(200).send({ message: 'Unlinked successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getChildren(request: any, reply: any) {
  try {
    const children = await parentService.getChildren(request.params.id);
    return reply.status(200).send({ data: children });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
