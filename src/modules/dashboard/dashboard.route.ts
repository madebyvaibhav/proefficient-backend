import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma';

export async function getStats(request: any, reply: any) {
  try {
    const [totalStudents, totalTeachers, totalClasses, totalParents] = await Promise.all([
      prisma.studentProfile.count({
        where: { user: { status: 'ACTIVE' } },
      }),
      prisma.teacherProfile.count({
        where: { user: { status: 'ACTIVE' } },
      }),
      prisma.class.count(),
      prisma.user.count({ where: { role: 'parent', status: 'ACTIVE' } }),
    ]);

    reply.send({ totalStudents, totalTeachers, totalClasses, totalParents });
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function getToday(request: any, reply: any) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Today's lectures
    const todayLectures = await prisma.lecture.findMany({
      where: {
        startTime: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        section: { include: { class: true } },
        subject: true,
        teacher: { include: { user: { select: { name: true } } } },
        _count: { select: { attendances: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Today's attendance % (only COMPLETED lectures)
    const completedLectures = todayLectures.filter((l) => l.status === 'COMPLETED');
    let todayAttendancePercent: number | null = null;
    let hasData = false;

    if (completedLectures.length > 0) {
      hasData = true;
      const totalRecords = await prisma.attendance.count({
        where: { lecture: { id: { in: completedLectures.map((l) => l.id) } } },
      });
      const presentRecords = await prisma.attendance.count({
        where: {
          lecture: { id: { in: completedLectures.map((l) => l.id) } },
          status: { in: ['PRESENT', 'LATE'] },
        },
      });
      todayAttendancePercent = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100 * 10) / 10 : null;
    }

    // Recent remarks (last 5)
    const recentRemarks = await prisma.remark.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: { select: { name: true } }, class: true, section: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    // Class-wise student strength
    const classStrength = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        standard: true,
        _count: { select: { students: true } },
      },
      orderBy: { standard: 'asc' },
    });

    reply.send({
      todayLectures: todayLectures.map((l) => ({
        id: l.id,
        className: l.section.class.name,
        sectionName: l.section.name,
        subjectName: l.subject.name,
        teacherName: l.teacher.user.name,
        startTime: l.startTime,
        endTime: l.endTime,
        status: l.status,
        attendanceCount: l._count.attendances,
      })),
      todayAttendancePercent,
      hasData,
      recentRemarks: recentRemarks.map((r) => ({
        id: r.id,
        studentName: r.student.user.name,
        className: r.student.class.name,
        sectionName: r.student.section.name,
        teacherName: r.teacher.user.name,
        type: r.type,
        content: r.content,
        createdAt: r.createdAt,
      })),
      classStrength: classStrength.map((c) => ({
        className: c.name,
        standard: c.standard,
        studentCount: c._count.students,
      })),
    });
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

async function dashboardRoutes(app: FastifyInstance) {
  app.get('/stats', { onRequest: [(app as any).authenticate] }, getStats);
  app.get('/today', { onRequest: [(app as any).authenticate] }, getToday);
}

export default dashboardRoutes;
