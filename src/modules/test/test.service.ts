import { prisma } from '../../prisma';

export async function getAllTests(classId?: string, subjectId?: string) {
  return prisma.test.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      class: true,
      subject: true,
      section: true,
      marks: true,
      _count: { select: { marks: true } }
    },
    orderBy: { testDate: 'desc' }
  });
}

export async function getTestById(id: string) {
  return prisma.test.findUnique({
    where: { id },
    include: {
      class: true,
      subject: true,
      section: true,
      marks: {
        include: {
          student: { include: { user: true } }
        },
        orderBy: { marks: 'desc' }
      }
    }
  });
}

export async function createTest(data: {
  classId: string;
  sectionId?: string;
  subjectId?: string;
  title: string;
  totalMarks: number;
  passingMarks?: number;
  testDate?: Date;
}) {
  let sectionId = data.sectionId;
  if (!sectionId && data.classId) {
    let section = await prisma.section.findFirst({ where: { classId: data.classId } });
    if (!section) {
      section = await prisma.section.create({ data: { classId: data.classId, name: 'A' } });
    }
    sectionId = section.id;
  }

  let subjectId = data.subjectId;
  if (!subjectId) {
    const classSub = await prisma.classSubject.findFirst({ where: { classId: data.classId } });
    if (classSub) {
      subjectId = classSub.subjectId;
    } else {
      const anySub = await prisma.subject.findFirst();
      if (anySub) {
        subjectId = anySub.id;
      } else {
        const newSub = await prisma.subject.create({
          data: { name: 'General Assessment', code: 'GEN101' },
        });
        subjectId = newSub.id;
      }
    }
  }

  const total = Number(data.totalMarks) || 50;
  const pass =
    data.passingMarks !== undefined && data.passingMarks !== null
      ? Number(data.passingMarks)
      : Math.round(total * 0.33);

  return (prisma.test as any).create({
    data: {
      classId: data.classId,
      sectionId: sectionId,
      subjectId,
      title: data.title,
      totalMarks: total,
      passingMarks: pass,
      testDate: data.testDate ? new Date(data.testDate) : new Date(),
    },
    include: {
      class: true,
      subject: true,
      section: true,
      marks: true,
      _count: { select: { marks: true } },
    },
  });
}

export async function updateTest(id: string, data: any) {
  return (prisma.test as any).update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.totalMarks !== undefined && { totalMarks: Number(data.totalMarks) }),
      ...(data.passingMarks !== undefined && { passingMarks: Number(data.passingMarks) }),
      ...(data.testDate && { testDate: new Date(data.testDate) }),
      ...(data.subjectId && { subjectId: data.subjectId }),
      ...(data.classId && { classId: data.classId }),
    },
    include: {
      class: true,
      subject: true,
      section: true,
      marks: true,
      _count: { select: { marks: true } },
    },
  });
}

export async function deleteTest(id: string) {
  return prisma.test.delete({ where: { id } });
}

export async function bulkEnterMarks(testId: string, marksData: { studentId: string; marks: number }[]) {
  const profiles = await prisma.studentProfile.findMany({
    select: { id: true, userId: true }
  });
  const idMap = new Map<string, string>();
  for (const p of profiles) {
    idMap.set(p.id, p.id);
    if (p.userId) idMap.set(p.userId, p.id);
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const item of marksData) {
      const studentProfileId = idMap.get(item.studentId) || item.studentId;
      await tx.mark.upsert({
        where: { testId_studentId: { testId, studentId: studentProfileId } },
        update: { marks: Number(item.marks) },
        create: { testId, studentId: studentProfileId, marks: Number(item.marks) },
      });
    }

    const allMarks = await tx.mark.findMany({
      where: { testId },
      orderBy: { marks: 'desc' },
    });

    let currentRank = 1;
    for (let i = 0; i < allMarks.length; i++) {
      if (i > 0 && allMarks[i].marks < allMarks[i - 1].marks) {
        currentRank += 1;
      }
      await tx.mark.update({
        where: { id: allMarks[i].id },
        data: { rank: currentRank },
      });
    }

    return true;
  });

  // Automatically dispatch in-app and parent/student notifications
  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        subject: true,
      },
    });

    if (test) {
      const studentIds = marksData.map((m) => m.studentId);
      const students = await prisma.studentProfile.findMany({
        where: { id: { in: studentIds } },
        include: {
          user: { select: { id: true, name: true } },
          parentLinks: { include: { parent: { select: { id: true, name: true } } } },
          marks: { where: { testId } },
        },
      });

      const notificationsToCreate: any[] = [];
      const subjectName = test.subject?.name || 'Assessment';
      const className = test.class?.name || 'Batch';

      for (const stu of students) {
        const studentMark = stu.marks?.[0];
        const marksObtained = studentMark ? studentMark.marks : 0;
        const rank = studentMark?.rank ? `#${studentMark.rank}` : '';
        const studentName = stu.user?.name || 'Student';

        // 1. Notification for Student Account
        if (stu.user?.id) {
          notificationsToCreate.push({
            userId: stu.user.id,
            title: `📝 Test Result: ${test.title}`,
            body: `Your score for ${test.title} (${subjectName}) is ${marksObtained}/${test.totalMarks} ${rank ? `(Rank ${rank})` : ''}. Tap to view full marksheet.`,
            type: 'RESULT',
          });
        }

        // 2. Notification for Linked Parents
        if (stu.parentLinks && Array.isArray(stu.parentLinks)) {
          for (const link of stu.parentLinks) {
            if (link.parent?.id) {
              notificationsToCreate.push({
                userId: link.parent.id,
                title: `📝 Test Result Declared: ${test.title}`,
                body: `Dear Parent, ${studentName}'s result for ${test.title} (${subjectName} - ${className}) is published. Score: ${marksObtained}/${test.totalMarks} ${rank ? `(Rank ${rank})` : ''}.`,
                type: 'RESULT',
              });
            }
          }
        }
      }

      if (notificationsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: notificationsToCreate,
        });
      }
    }
  } catch (notifErr) {
    console.error('Failed to dispatch test result notifications', notifErr);
  }

  return result;
}

export async function getResults(testId: string) {
  const test = await prisma.test.findUniqueOrThrow({
    where: { id: testId },
    include: {
      class: true,
      subject: true,
      marks: {
        include: { student: { include: { user: true } } },
        orderBy: { marks: 'desc' },
      },
    },
  });

  const marks = test.marks;
  let highest = 0,
    lowest = test.totalMarks,
    total = 0,
    passCount = 0,
    failCount = 0;

  const passThreshold = (test as any).passingMarks || test.totalMarks * 0.33;

  for (const m of marks) {
    if (m.marks > highest) highest = m.marks;
    if (m.marks < lowest) lowest = m.marks;
    total += m.marks;
    if (m.marks >= passThreshold) passCount++;
    else failCount++;
  }

  const average = marks.length ? total / marks.length : 0;

  return {
    test,
    marks,
    stats: {
      highest: marks.length ? highest : 0,
      lowest: marks.length ? lowest : 0,
      average: Math.round(average * 10) / 10,
      passCount,
      failCount,
      totalStudents: marks.length,
    },
  };
}

export async function getStudentSummary(studentId: string) {
  let profileId = studentId;
  const profile = await prisma.studentProfile.findFirst({
    where: {
      OR: [{ id: studentId }, { userId: studentId }]
    }
  });
  if (profile) profileId = profile.id;

  return prisma.mark.findMany({
    where: { studentId: profileId },
    include: {
      test: { include: { subject: true, class: true } },
    },
    orderBy: { test: { testDate: 'desc' } },
  });
}
