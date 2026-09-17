import * as timetableService from './timetable.service';

export async function getSectionTimetable(request: any, reply: any) {
  try {
    const timetable = await timetableService.getSectionTimetable(request.params.sectionId);
    
    // Group by dayOfWeek
    const grouped = timetable.reduce((acc: any, curr) => {
      const day = curr.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(curr);
      return acc;
    }, {});

    return reply.status(200).send({ data: grouped });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function create(request: any, reply: any) {
  try {
    const { teacherId, dayOfWeek, startTime, endTime } = request.body;
    
    const hasConflict = await timetableService.checkConflict(teacherId, dayOfWeek, startTime, endTime);
    if (hasConflict) {
      return reply.status(409).send({ error: 'Teacher is already assigned to another class at this time.' });
    }

    const entry = await timetableService.createEntry(request.body);
    return reply.status(201).send({ data: entry });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function update(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { teacherId, dayOfWeek, startTime, endTime } = request.body;
    
    // In a real scenario we'd need to fetch existing entry if not fully provided, 
    // but assuming body provides them if they are changing.
    // If they provide all these fields, check conflict:
    if (teacherId && dayOfWeek && startTime && endTime) {
      const hasConflict = await timetableService.checkConflict(teacherId, dayOfWeek, startTime, endTime, id);
      if (hasConflict) {
        return reply.status(409).send({ error: 'Teacher is already assigned to another class at this time.' });
      }
    }

    const entry = await timetableService.updateEntry(id, request.body);
    return reply.status(200).send({ data: entry });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function deleteEntry(request: any, reply: any) {
  try {
    await timetableService.deleteEntry(request.params.id);
    return reply.status(200).send({ message: 'Deleted successfully' });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function clearSection(request: any, reply: any) {
  try {
    const { sectionId } = request.params;
    const { dayOfWeek } = request.query;
    const day = dayOfWeek ? Number(dayOfWeek) : undefined;
    const result = await timetableService.clearSectionTimetable(sectionId, day);
    return reply.status(200).send({ message: 'Cleared timetable successfully', count: result.count });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getMySchedule(request: any, reply: any) {
  try {
    const dayOfWeek = request.query?.dayOfWeek ? Number(request.query.dayOfWeek) : undefined;
    const schedule = await timetableService.getTeacherSchedule(request.user.id, dayOfWeek);
    return reply.status(200).send({ data: schedule });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function getStudentSchedule(request: any, reply: any) {
  try {
    const dayOfWeek = request.query?.dayOfWeek ? Number(request.query.dayOfWeek) : undefined;
    const schedule = await timetableService.getStudentSchedule(request.user.id, dayOfWeek);
    return reply.status(200).send({ data: schedule });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}

export async function bulkCreate(request: any, reply: any) {
  try {
    const entries = request.body; // array of entries
    const results = [];
    
    for (const entry of entries) {
      const { teacherId, dayOfWeek, startTime, endTime } = entry;
      const hasConflict = await timetableService.checkConflict(teacherId, dayOfWeek, startTime, endTime);
      
      if (hasConflict) {
        return reply.status(409).send({ error: 'Teacher is already assigned to another class at this time.' });
      }
      
      const newEntry = await timetableService.createEntry(entry);
      results.push(newEntry);
    }

    return reply.status(201).send({ data: results });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
}
