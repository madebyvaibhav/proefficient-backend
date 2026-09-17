import * as testService from './test.service';

export async function getAll(request: any, reply: any) {
  try {
    const { classId, subjectId } = request.query;
    const data = await testService.getAllTests(classId, subjectId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const data = await testService.getTestById(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Test not found' });
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function create(request: any, reply: any) {
  try {
    const { classId, sectionId, subjectId, title, totalMarks, passingMarks, testDate } = request.body;
    if (!classId || !title || totalMarks === undefined) {
      return reply.status(400).send({ error: 'Missing required fields: classId, title, and totalMarks are required' });
    }
    const data = await testService.createTest({
      classId,
      sectionId,
      subjectId,
      title: title.trim(),
      totalMarks: Number(totalMarks),
      passingMarks: passingMarks !== undefined ? Number(passingMarks) : undefined,
      testDate: testDate ? new Date(testDate) : new Date(),
    });
    reply.status(201).send(data);
  } catch (error: any) {
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function update(request: any, reply: any) {
  try {
    const data = await testService.updateTest(request.params.id, request.body);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function deleteTest(request: any, reply: any) {
  try {
    await testService.deleteTest(request.params.id);
    reply.status(200).send({ message: 'Deleted successfully' });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function bulkEnterMarks(request: any, reply: any) {
  try {
    const { marks } = request.body;
    if (!Array.isArray(marks)) return reply.status(400).send({ error: 'Marks must be an array' });
    await testService.bulkEnterMarks(request.params.id, marks);
    reply.status(201).send({ message: 'Marks updated and ranks calculated' });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getResults(request: any, reply: any) {
  try {
    const data = await testService.getResults(request.params.id);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getStudentSummary(request: any, reply: any) {
  try {
    const data = await testService.getStudentSummary(request.params.studentId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}
