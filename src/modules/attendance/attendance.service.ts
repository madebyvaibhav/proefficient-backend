import { prisma } from '../../prisma';

export async function startLecture(data: { sectionId: string; subjectId: string; teacherId?: string; topic?: string }) {
  let teacherId = data.teacherId;
  if (!teacherId) {
    const firstTeacher = await prisma.teacherProfile.findFirst();
    teacherId = firstTeacher?.id || '';
  }

  // Check if an ONGOING lecture already exists for this section and subject
  let lecture = await prisma.lecture.findFirst({
    where: {
      sectionId: data.sectionId,
      subjectId: data.subjectId,
      status: 'ONGOING'
    },
    include: {
      subject: true,
      section: { include: { class: true } },
    }
  });

  if (!lecture) {
    lecture = await prisma.lecture.create({
      data: {
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        teacherId,
        topic: data.topic,
        startTime: new Date(),
        status: 'ONGOING'
      },
      include: {
        subject: true,
        section: { include: { class: true } },
      }
    });
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      sectionId: data.sectionId,
    },
    include: {
      user: { select: { name: true, email: true, mobile: true } },
      parentLinks: { include: { parent: { select: { id: true, name: true, mobile: true } } } }
    }
  });

  return { lecture, students };
}

export async function markAttendance(
  lectureId: string,
  records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; entryTime?: string; remarks?: string }[],
  recordedByUserId?: string,
  userRole?: string
) {
  // Fetch Lecture & Section & Subject info upfront
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    include: {
      subject: true,
      section: { include: { class: true } }
    }
  });

  if (!lecture) {
    throw new Error('Lecture session not found');
  }

  // Once teacher ends lecture (COMPLETED), ONLY an Admin can modify the attendance sheet!
  if (lecture.status === 'COMPLETED' && userRole?.toLowerCase() !== 'admin') {
    throw new Error('This lecture has ended. Once a lecture is concluded, only an Administrator can make changes to the attendance sheet.');
  }

  // Fetch existing attendance records to track changes & prevent duplicate notifications
  const existingRecords = await prisma.attendance.findMany({
    where: { lectureId }
  });
  const existingStatusMap = new Map(existingRecords.map(r => [r.studentId, r.status]));
  const existingDispatchMap = new Map(existingRecords.map(r => [r.studentId, r.dispatchStatus]));
  const isFirstSubmission = existingRecords.length === 0;

  // Prohibit non-admin from modifying attendance for departed students
  if (userRole?.toLowerCase() !== 'admin') {
    for (const record of records) {
      const prevDispatch = existingDispatchMap.get(record.studentId);
      const prevStatus = existingStatusMap.get(record.studentId);
      if (prevDispatch === 'DISPATCHED' && prevStatus && prevStatus !== record.status) {
        throw new Error('Cannot modify attendance for departed students. Once a student has left the lecture, their attendance status is locked.');
      }
    }
  }

  const now = new Date();
  const lectureStartTime = lecture?.startTime ? new Date(lecture.startTime) : now;
  const startTimeStr = lectureStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const defaultLateMinutes = Math.max(1, Math.round((now.getTime() - lectureStartTime.getTime()) / 60000));

  const upsertPromises = records.map(record => {
    const entryTimeDate = record.entryTime ? new Date(record.entryTime) : new Date();
    let lateDuration = 0;
    if (record.status === 'LATE' || record.status === 'PRESENT') {
      const diffMs = entryTimeDate.getTime() - lectureStartTime.getTime();
      lateDuration = Math.max(0, Math.round(diffMs / 60000));
    }
    const finalLateDuration = record.status === 'LATE' ? (lateDuration || defaultLateMinutes) : 0;

    return prisma.attendance.upsert({
      where: {
        lectureId_studentId: {
          lectureId,
          studentId: record.studentId
        }
      },
      update: {
        status: record.status,
        entryTime: record.status !== 'ABSENT' ? entryTimeDate : null,
        lateDuration: finalLateDuration,
        remarks: record.remarks || undefined,
        recordedBy: recordedByUserId || undefined,
      },
      create: {
        lectureId,
        studentId: record.studentId,
        status: record.status,
        entryTime: record.status !== 'ABSENT' ? entryTimeDate : null,
        lateDuration: finalLateDuration,
        remarks: record.remarks || undefined,
        recordedBy: recordedByUserId || undefined,
        dispatchStatus: 'IN_CLASS'
      }
    });
  });

  await prisma.$transaction(upsertPromises);

  const className = lecture?.section?.class?.name || 'Class Batch';
  const subjectName = lecture?.subject?.name || 'Lecture';

  // Find all student profiles and their linked parents
  const studentIds = records.map(r => r.studentId);
  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds } },
    include: {
      user: { select: { name: true } },
      parentLinks: { include: { parent: { select: { id: true, name: true } } } }
    }
  });

  const studentMap = new Map(students.map(s => [s.id, s]));
  const notificationsToCreate: any[] = [];
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  for (const record of records) {
    const stu = studentMap.get(record.studentId);
    if (!stu) continue;

    const studentName = stu.user?.name || 'Your child';
    const oldStatus = existingStatusMap.get(record.studentId);

    if (record.status === 'PRESENT') {
      presentCount++;
      // Only send if first submission OR status changed from ABSENT/LATE
      if (isFirstSubmission || oldStatus !== 'PRESENT') {
        const title = isFirstSubmission
          ? '✅ Class Attendance: Child is Present'
          : '✅ Attendance Update: Child Marked Present';
        const body = `Dear Parent, your child ${studentName} is PRESENT in ${className} for ${subjectName} lecture (started at ${startTimeStr}). — Proefficient Institute`;

        for (const link of stu.parentLinks) {
          if (link.parent?.id) {
            notificationsToCreate.push({
              userId: link.parent.id,
              title,
              body,
              type: 'ATTENDANCE',
            });
          }
        }
        if (stu.userId) {
          notificationsToCreate.push({
            userId: stu.userId,
            title: isFirstSubmission ? '✅ Attendance: Marked Present' : '✅ Attendance Update: Marked Present',
            body: `You are marked PRESENT in ${className} for ${subjectName} lecture.`,
            type: 'ATTENDANCE',
          });
        }
      }
    } else if (record.status === 'LATE') {
      lateCount++;
      const studentLateMin = record.entryTime
        ? Math.max(1, Math.round((new Date(record.entryTime).getTime() - lectureStartTime.getTime()) / 60000))
        : defaultLateMinutes;
      // Only send if first submission OR status changed from ABSENT/PRESENT
      if (isFirstSubmission || oldStatus !== 'LATE') {
        const title = '⏰ Late Arrival: Child Arrived in Class';
        const body = isFirstSubmission
          ? `Dear Parent, your child ${studentName} arrived LATE (${studentLateMin} min late) for ${subjectName} in ${className} (started at ${startTimeStr}). — Proefficient Institute`
          : `Dear Parent, your child ${studentName} has ARRIVED in class now (${studentLateMin} min late) for ${subjectName} lecture in ${className}. — Proefficient Institute`;

        for (const link of stu.parentLinks) {
          if (link.parent?.id) {
            notificationsToCreate.push({
              userId: link.parent.id,
              title,
              body,
              type: 'ATTENDANCE',
            });
          }
        }
        if (stu.userId) {
          notificationsToCreate.push({
            userId: stu.userId,
            title: '⏰ Attendance: Marked Late',
            body: `You are marked LATE in ${className} for ${subjectName} lecture.`,
            type: 'ATTENDANCE',
          });
        }
      }
    } else {
      absentCount++;
      // Only send if first submission OR status changed from PRESENT/LATE
      if (isFirstSubmission || (oldStatus && oldStatus !== 'ABSENT')) {
        const title = '⚠️ Attendance Alert: Child is Absent';
        const body = `Dear Parent, your child ${studentName} is marked ABSENT in ${className} for ${subjectName} lecture started at ${startTimeStr}. Please contact Proefficient Institute if unexpected.`;

        for (const link of stu.parentLinks) {
          if (link.parent?.id) {
            notificationsToCreate.push({
              userId: link.parent.id,
              title,
              body,
              type: 'ATTENDANCE',
            });
          }
        }
        if (stu.userId) {
          notificationsToCreate.push({
            userId: stu.userId,
            title: '⚠️ Attendance Alert: Marked Absent',
            body: `You are marked ABSENT in ${className} for ${subjectName} lecture. Please contact your coordinator.`,
            type: 'ATTENDANCE',
          });
        }
      }
    }
  }

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({
      data: notificationsToCreate
    });
  }

  return {
    message: 'Attendance marked successfully',
    presentCount,
    absentCount,
    lateCount,
    notifiedParentsCount: notificationsToCreate.length,
    lecture,
  };
}

export async function endLecture(lectureId: string) {
  const endTime = new Date();

  // Verify lecture exists and is not already completed
  const existingLecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!existingLecture) {
    throw new Error('Lecture session not found');
  }
  if (existingLecture.status === 'COMPLETED') {
    throw new Error('This lecture has already been concluded.');
  }

  // 1. Find attendances of students who are STILL IN CLASS or in DOUBTS (i.e., not already dispatched)
  const remainingAttendances = await prisma.attendance.findMany({
    where: {
      lectureId,
      status: { in: ['PRESENT', 'LATE'] },
      dispatchStatus: { in: ['IN_CLASS', 'DOUBTS'] }
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          parentLinks: { include: { parent: { select: { id: true, name: true } } } }
        }
      }
    }
  });

  // 2. Count how many students were already dispatched earlier during this lecture
  const previouslyDispatchedCount = await prisma.attendance.count({
    where: {
      lectureId,
      dispatchStatus: 'DISPATCHED'
    }
  });
  const hadEarlyDepartures = previouslyDispatchedCount > 0;

  // 3. Mark remaining students as DISPATCHED
  await prisma.attendance.updateMany({
    where: { 
      lectureId, 
      dispatchStatus: { in: ['IN_CLASS', 'DOUBTS'] } 
    },
    data: {
      dispatchStatus: 'DISPATCHED',
      leftAt: endTime,
      exitTime: endTime,
      earlyLeaveDuration: 0,
    }
  });

  // 4. Update lecture status
  const updatedLecture = await prisma.lecture.update({
    where: { id: lectureId },
    data: {
      status: 'COMPLETED',
      endTime
    },
    include: {
      subject: true,
      section: { include: { class: true } }
    }
  });

  const className = updatedLecture.section?.class?.name || 'Class Batch';
  const subjectName = updatedLecture.subject?.name || 'Lecture';
  const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const departureNotifications: any[] = [];

  // 5. Send notifications ONLY to the remaining students who stayed for extra lecture / doubts
  for (const att of remainingAttendances) {
    const studentName = att.student?.user?.name || 'Your child';
    const isExtraSession = hadEarlyDepartures || att.dispatchStatus === 'DOUBTS';

    const title = isExtraSession 
      ? '🏁 Extra Lecture Concluded: Child Departure Alert' 
      : '🏁 Class Over: Child Departure Alert';

    const body = isExtraSession
      ? `Dear Parent, extra lecture / doubt session for ${studentName} in ${subjectName} (${className}) has ENDED at ${endTimeStr}. Your child has left the coaching institute. — Proefficient Institute`
      : `Dear Parent, ${subjectName} lecture for ${studentName} in ${className} has ENDED at ${endTimeStr}. Your child has left the coaching institute. — Proefficient Institute`;

    for (const link of att.student.parentLinks) {
      if (link.parent?.id) {
        departureNotifications.push({
          userId: link.parent.id,
          title,
          body,
          type: 'ATTENDANCE',
        });
      }
    }

    if (att.student?.userId) {
      departureNotifications.push({
        userId: att.student.userId,
        title: isExtraSession ? '🏁 Extra Lecture Concluded' : '🏁 Class Concluded',
        body: `${isExtraSession ? 'Extra lecture / doubt session' : 'Lecture'} for ${subjectName} in ${className} has ended at ${endTimeStr}.`,
        type: 'ATTENDANCE',
      });
    }
  }

  if (departureNotifications.length > 0) {
    await prisma.notification.createMany({
      data: departureNotifications
    });
  }

  return {
    message: 'Lecture ended successfully',
    lecture: updatedLecture,
    notifiedParentsCount: departureNotifications.length,
    remainingStudentsCount: remainingAttendances.length,
    previouslyDispatchedCount,
  };
}

export async function getStudentSummary(studentId: string) {
  let profile = await prisma.studentProfile.findFirst({
    where: {
      OR: [{ id: studentId }, { userId: studentId }]
    },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      class: { select: { id: true, name: true, standard: true } },
      section: { select: { id: true, name: true } },
      parentLinks: {
        include: {
          parent: { select: { id: true, name: true, mobile: true, email: true } }
        }
      }
    }
  });

  if (!profile) {
    throw new Error('Student profile not found');
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: profile.id,
    },
    include: {
      lecture: {
        include: {
          subject: true,
          section: { include: { class: true } },
          teacher: { include: { user: { select: { name: true } } } }
        }
      }
    },
    orderBy: {
      lecture: {
        startTime: 'desc'
      }
    }
  });

  const totalLectures = attendances.length;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  for (const record of attendances) {
    if (record.status === 'PRESENT') {
      presentCount++;
    } else if (record.status === 'LATE') {
      lateCount++;
    } else if (record.status === 'ABSENT') {
      absentCount++;
    }
  }

  // Calculate consecutive absences counting from the latest session backwards
  let consecutiveAbsences = 0;
  for (const record of attendances) {
    if (record.status === 'ABSENT') {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  const attendedCount = presentCount + lateCount;
  const attendancePercentage = totalLectures > 0
    ? Math.round((attendedCount / totalLectures) * 1000) / 10
    : 0;

  const subjectMap: Record<string, { subject: any; total: number; present: number; late: number; absent: number }> = {};

  for (const record of attendances) {
    if (!record.lecture) continue;
    const subjectId = record.lecture.subjectId || 'general';
    if (!subjectMap[subjectId]) {
      subjectMap[subjectId] = {
        subject: record.lecture.subject || { name: 'General Lecture' },
        total: 0,
        present: 0,
        late: 0,
        absent: 0
      };
    }
    
    subjectMap[subjectId].total += 1;
    if (record.status === 'PRESENT') {
      subjectMap[subjectId].present += 1;
    } else if (record.status === 'LATE') {
      subjectMap[subjectId].late += 1;
    } else if (record.status === 'ABSENT') {
      subjectMap[subjectId].absent += 1;
    }
  }

  const subjectBreakdown = Object.values(subjectMap).map(item => ({
    subject: item.subject,
    total: item.total,
    present: item.present,
    late: item.late,
    absent: item.absent,
    percentage: item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 1000) / 10 : 0
  }));

  const recentHistory = attendances.slice(0, 20).map(att => ({
    id: att.id,
    lectureId: att.lectureId,
    date: att.lecture?.startTime,
    subjectName: att.lecture?.subject?.name || 'Lecture',
    topic: att.lecture?.topic || 'Regular Session',
    teacherName: att.lecture?.teacher?.user?.name || 'Faculty',
    status: att.status,
    dispatchStatus: att.dispatchStatus,
    entryTime: att.entryTime,
    leftAt: att.leftAt || att.exitTime,
    lateDuration: att.lateDuration,
    earlyLeaveDuration: att.earlyLeaveDuration,
    remarks: att.remarks
  }));

  return {
    student: {
      id: profile.id,
      userId: profile.userId,
      name: profile.user?.name || 'Unknown Student',
      email: profile.user?.email,
      mobile: profile.user?.mobile,
      rollNumber: profile.rollNumber,
      className: profile.class?.name || '',
      sectionName: profile.section?.name || '',
      parents: profile.parentLinks?.map(pl => ({
        id: pl.parent?.id,
        name: pl.parent?.name,
        mobile: pl.parent?.mobile,
        relation: pl.relation
      })) || []
    },
    stats: {
      totalLectures,
      presentCount,
      lateCount,
      absentCount,
      attendancePercentage,
      consecutiveAbsences,
      isChronicAbsent: consecutiveAbsences >= 2,
    },
    subjectBreakdown,
    recentHistory,
    summary: subjectBreakdown
  };
}

export async function getAttendanceHistory(query: {
  classId?: string;
  sectionId?: string;
  teacherId?: string;
  date?: string;
  search?: string;
  limit?: number;
  status?: string;
}) {
  const where: any = {};

  if (query.sectionId && query.sectionId !== 'ALL') {
    where.sectionId = query.sectionId;
  } else if (query.classId && query.classId !== 'ALL') {
    where.section = { classId: query.classId };
  }

  if (query.teacherId && query.teacherId !== 'ALL') {
    where.teacherId = query.teacherId;
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.date) {
    const startOfDay = new Date(query.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(query.date);
    endOfDay.setHours(23, 59, 59, 999);
    where.startTime = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (query.search) {
    where.OR = [
      { topic: { contains: query.search } },
      { subject: { name: { contains: query.search } } }
    ];
  }

  const limit = query.limit ? Number(query.limit) : 100;

  const lectures = await prisma.lecture.findMany({
    where,
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true, email: true } } } },
      section: { include: { class: true } },
      attendances: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true, mobile: true } }
            }
          }
        }
      },
      _count: { select: { attendances: true } }
    },
    orderBy: { startTime: 'desc' },
    take: limit
  });

  return lectures.map(lec => {
    const total = lec.attendances.length;
    const present = lec.attendances.filter(a => a.status === 'PRESENT').length;
    const late = lec.attendances.filter(a => a.status === 'LATE').length;
    const absent = lec.attendances.filter(a => a.status === 'ABSENT').length;
    const dispatched = lec.attendances.filter(a => a.dispatchStatus === 'DISPATCHED').length;
    const doubts = lec.attendances.filter(a => a.dispatchStatus === 'DOUBTS').length;
    const inClass = lec.attendances.filter(a => a.dispatchStatus === 'IN_CLASS').length;

    return {
      ...lec,
      stats: {
        total,
        present,
        late,
        absent,
        dispatched,
        doubts,
        inClass,
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0
      }
    };
  });
}

export async function getSectionLectures(sectionId: string, query: { date?: string }) {
  const where: any = { sectionId };

  if (query.date) {
    const startOfDay = new Date(query.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(query.date);
    endOfDay.setHours(23, 59, 59, 999);

    where.startTime = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  return prisma.lecture.findMany({
    where,
    include: {
      subject: true,
      teacher: { include: { user: true } },
      attendances: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      },
      _count: { select: { attendances: true } }
    },
    orderBy: { startTime: 'desc' }
  });
}

export async function getTrend(sectionId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lectures = await prisma.lecture.findMany({
    where: {
      sectionId,
      status: 'COMPLETED',
      startTime: { gte: thirtyDaysAgo }
    },
    include: {
      attendances: true
    },
    orderBy: { startTime: 'asc' }
  });

  if (lectures.length === 0) {
    return { hasData: false };
  }

  const dailyData: Record<string, { total: number; present: number }> = {};

  for (const lecture of lectures) {
    const dateStr = lecture.startTime.toISOString().split('T')[0];
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { total: 0, present: 0 };
    }
    
    dailyData[dateStr].total += lecture.attendances.length;
    
    for (const att of lecture.attendances) {
      if (att.status === 'PRESENT' || att.status === 'LATE') {
        dailyData[dateStr].present += 1;
      }
    }
  }

  const trend = Object.entries(dailyData).map(([date, counts]) => ({
    date,
    percentage: counts.total > 0 ? (counts.present / counts.total) * 100 : 0
  }));

  return { hasData: true, trend };
}

export async function dispatchStudents(lectureId: string, studentIds: string[], reason?: string, userRole?: string) {
  const leftAt = new Date();
  
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!lecture) {
    throw new Error('Lecture session not found');
  }

  // Once lecture is COMPLETED, ONLY Admin can modify departures
  if (lecture.status === 'COMPLETED' && userRole?.toLowerCase() !== 'admin') {
    throw new Error('This lecture has ended. Once a lecture is concluded, only an Administrator can modify student departures.');
  }

  // Calculate early leave duration if lecture has a known end time
  let earlyLeaveDuration = 0;
  if (lecture?.endTime) {
    const diffMs = new Date(lecture.endTime).getTime() - leftAt.getTime();
    earlyLeaveDuration = Math.max(0, Math.round(diffMs / 60000));
  }

  await prisma.attendance.updateMany({
    where: {
      lectureId,
      studentId: { in: studentIds }
    },
    data: {
      dispatchStatus: 'DISPATCHED',
      leftAt,
      exitTime: leftAt,
      earlyLeaveDuration,
    }
  });

  const lectureDetail = await prisma.lecture.findUnique({
    where: { id: lectureId },
    include: {
      subject: true,
      section: { include: { class: true } }
    }
  });

  const className = lectureDetail?.section?.class?.name || 'Class Batch';
  const subjectName = lectureDetail?.subject?.name || 'Lecture';
  const timeStr = leftAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds } },
    include: {
      user: { select: { name: true } },
      parentLinks: { include: { parent: { select: { id: true, name: true } } } }
    }
  });

  const notifications: any[] = [];

  for (const stu of students) {
    const studentName = stu.user?.name || 'Your child';
    
    for (const link of stu.parentLinks) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: '🏁 Child Departure Alert',
          body: `Dear Parent, your child ${studentName} has left the coaching institute after ${subjectName} lecture in ${className} at ${timeStr}. — Proefficient Institute`,
          type: 'ATTENDANCE'
        });
      }
    }

    if (stu.userId) {
      notifications.push({
        userId: stu.userId,
        title: '🏁 Class Ended — You have been marked as departed.',
        body: `You have left the coaching institute after ${subjectName} lecture at ${timeStr}.`,
        type: 'ATTENDANCE'
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return { dispatched: studentIds.length, notified: notifications.length };
}

export async function markDoubtSession(lectureId: string, studentIds: string[], userRole?: string) {
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    include: { subject: true }
  });

  if (!lecture) {
    throw new Error('Lecture session not found');
  }

  // Once lecture is COMPLETED, ONLY Admin can modify doubt sessions
  if (lecture.status === 'COMPLETED' && userRole?.toLowerCase() !== 'admin') {
    throw new Error('This lecture has ended. Once a lecture is concluded, only an Administrator can modify doubt sessions.');
  }

  await prisma.attendance.updateMany({
    where: {
      lectureId,
      studentId: { in: studentIds }
    },
    data: {
      dispatchStatus: 'DOUBTS'
    }
  });

  const subjectName = lecture?.subject?.name || 'Lecture';

  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds } },
    include: {
      user: { select: { name: true } },
      parentLinks: { include: { parent: { select: { id: true } } } }
    }
  });

  const notifications: any[] = [];
  
  for (const stu of students) {
    const studentName = stu.user?.name || 'Your child';
    for (const link of stu.parentLinks) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: '📚 Doubt Session Alert',
          body: `📚 Doubt Session: Your child ${studentName} is attending an extra doubt-clearing session after ${subjectName} class.`,
          type: 'ATTENDANCE'
        });
      }
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return { updated: studentIds.length };
}

export async function getLectureDispatchStatus(lectureId: string) {
  const attendances = await prisma.attendance.findMany({
    where: { lectureId },
    include: {
      student: {
        include: {
          user: { select: { name: true } }
        }
      }
    }
  });

  const records = attendances.map(a => ({
    studentId: a.studentId,
    studentName: a.student?.user?.name,
    rollNumber: a.student?.rollNumber,
    status: a.status,
    dispatchStatus: a.dispatchStatus,
    leftAt: a.leftAt
  }));

  const grouped = {
    all: records,
    inClass: records.filter(r => r.dispatchStatus === 'IN_CLASS'),
    doubts: records.filter(r => r.dispatchStatus === 'DOUBTS'),
    dispatched: records.filter(r => r.dispatchStatus === 'DISPATCHED')
  };

  return grouped;
}

export async function getLectureDetails(lectureId: string) {
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true, email: true, mobile: true } } } },
      section: { include: { class: true } },
      attendances: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true, mobile: true } }
            }
          }
        }
      },
      _count: { select: { attendances: true } }
    }
  });

  if (!lecture) {
    throw new Error('Lecture session not found');
  }

  const total = lecture.attendances.length;
  const present = lecture.attendances.filter(a => a.status === 'PRESENT').length;
  const late = lecture.attendances.filter(a => a.status === 'LATE').length;
  const absent = lecture.attendances.filter(a => a.status === 'ABSENT').length;
  const dispatched = lecture.attendances.filter(a => a.dispatchStatus === 'DISPATCHED').length;
  const doubts = lecture.attendances.filter(a => a.dispatchStatus === 'DOUBTS').length;
  const inClass = lecture.attendances.filter(a => a.dispatchStatus === 'IN_CLASS').length;

  return {
    ...lecture,
    stats: {
      total,
      present,
      late,
      absent,
      dispatched,
      doubts,
      inClass,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0
    }
  };
}
