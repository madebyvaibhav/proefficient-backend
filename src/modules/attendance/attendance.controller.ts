import * as attendanceService from './attendance.service';

export async function startLecture(request: any, reply: any) {
  try {
    const result = await attendanceService.startLecture(request.body);
    return reply.status(201).send({ data: result });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function markAttendance(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { records } = request.body;
    const recordedByUserId = request.user?.id;
    const userRole = request.user?.role;
    const result = await attendanceService.markAttendance(id, records, recordedByUserId, userRole);
    return reply.status(200).send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function endLecture(request: any, reply: any) {
  try {
    const { id } = request.params;
    const lecture = await attendanceService.endLecture(id);
    return reply.status(200).send({ data: lecture });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getStudentSummary(request: any, reply: any) {
  try {
    const { studentId } = request.params;
    const summary = await attendanceService.getStudentSummary(studentId);
    return reply.status(200).send({ data: summary });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getSectionLectures(request: any, reply: any) {
  try {
    const { sectionId } = request.params;
    const lectures = await attendanceService.getSectionLectures(sectionId, request.query);
    return reply.status(200).send({ data: lectures });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getTrend(request: any, reply: any) {
  try {
    const { sectionId } = request.query;
    if (!sectionId) return reply.status(400).send({ error: 'sectionId is required in query' });
    const trend = await attendanceService.getTrend(sectionId);
    return reply.status(200).send({ data: trend });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function dispatchStudents(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { studentIds, reason } = request.body;
    const userRole = request.user?.role;
    const result = await attendanceService.dispatchStudents(id, studentIds, reason, userRole);
    return reply.status(200).send({ data: result });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function markDoubtSession(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { studentIds } = request.body;
    const userRole = request.user?.role;
    const result = await attendanceService.markDoubtSession(id, studentIds, userRole);
    return reply.status(200).send({ data: result });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getLectureDispatchStatus(request: any, reply: any) {
  try {
    const { id } = request.params;
    const result = await attendanceService.getLectureDispatchStatus(id);
    return reply.status(200).send({ data: result });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getAttendanceHistory(request: any, reply: any) {
  try {
    const history = await attendanceService.getAttendanceHistory(request.query);
    return reply.status(200).send({ data: history });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getLectureDetails(request: any, reply: any) {
  try {
    const { id } = request.params;
    const lecture = await attendanceService.getLectureDetails(id);
    return reply.status(200).send({ data: lecture });
  } catch (error: any) {
    return reply.status(404).send({ error: error.message });
  }
}
