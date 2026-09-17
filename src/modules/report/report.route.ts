import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma';
import ExcelJS from 'exceljs';

export async function attendanceReport(request: any, reply: any) {
  try {
    const { classId, sectionId } = request.query as { classId?: string; sectionId?: string };
    if (!classId) return reply.code(400).send({ message: 'classId is required' });

    const where: any = { class: { id: classId } };
    if (sectionId) where.sectionId = sectionId;

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { name: true } },
        class: true,
        section: true,
        attendances: { include: { lecture: true } },
      },
      orderBy: { rollNumber: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    sheet.columns = [
      { header: 'Roll No', key: 'rollNumber', width: 12 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Class', key: 'className', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Total Lectures', key: 'total', width: 15 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Late', key: 'late', width: 10 },
      { header: 'Attendance %', key: 'percentage', width: 15 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const s of students) {
      const completed = s.attendances.filter((a) => a.lecture.status === 'COMPLETED');
      const present = completed.filter((a) => a.status === 'PRESENT').length;
      const late = completed.filter((a) => a.status === 'LATE').length;
      const absent = completed.filter((a) => a.status === 'ABSENT').length;
      const total = completed.length;
      const pct = total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0;

      sheet.addRow({
        rollNumber: s.rollNumber,
        name: s.user.name,
        className: s.class.name,
        section: s.section.name,
        total,
        present,
        absent,
        late,
        percentage: pct,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=attendance_report.xlsx')
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function feesReport(request: any, reply: any) {
  try {
    const fees = await prisma.fee.findMany({
      include: {
        student: {
          include: { user: { select: { name: true } }, class: true, section: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fee Report');

    sheet.columns = [
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Roll No', key: 'roll', width: 12 },
      { header: 'Class', key: 'className', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Fee Title', key: 'title', width: 30 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Paid Amount', key: 'paidAmount', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const f of fees) {
      sheet.addRow({
        name: f.student.user.name,
        roll: f.student.rollNumber,
        className: f.student.class.name,
        section: f.student.section.name,
        title: f.title,
        totalAmount: f.totalAmount,
        paidAmount: f.paidAmount,
        balance: f.totalAmount - f.paidAmount,
        dueDate: f.dueDate.toISOString().split('T')[0],
        status: f.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=fee_report.xlsx')
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function marksReport(request: any, reply: any) {
  try {
    const { testId } = request.query as { testId: string };
    if (!testId) return reply.code(400).send({ message: 'testId is required' });

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        subject: true,
        section: true,
        marks: {
          include: { student: { include: { user: { select: { name: true } } } } },
          orderBy: { rank: 'asc' },
        },
      },
    });

    if (!test) return reply.code(404).send({ message: 'Test not found' });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Marks Report');

    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Roll No', key: 'roll', width: 12 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Marks Obtained', key: 'marks', width: 15 },
      { header: 'Total Marks', key: 'totalMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const m of test.marks) {
      sheet.addRow({
        rank: m.rank || '-',
        roll: m.student.rollNumber,
        name: m.student.user.name,
        marks: m.marks,
        totalMarks: test.totalMarks,
        percentage: Math.round((m.marks / test.totalMarks) * 100 * 10) / 10,
      });
    }

    const subjectName = test.subject?.name ? test.subject.name.replace(/[^a-zA-Z0-9]/g, '_') : 'General';
    const testTitle = test.title ? test.title.replace(/[^a-zA-Z0-9]/g, '_') : 'Assessment';
    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename=marks_${subjectName}_${testTitle}.xlsx`)
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function studentsReport(request: any, reply: any) {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { name: true, email: true, mobile: true, status: true } },
        class: true,
        section: true,
      },
      orderBy: [{ class: { standard: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Student Directory');

    sheet.columns = [
      { header: 'Roll No', key: 'rollNumber', width: 12 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Class', key: 'className', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Admission Date', key: 'admissionDate', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const s of students) {
      sheet.addRow({
        rollNumber: s.rollNumber,
        name: s.user.name,
        className: s.class.name,
        section: s.section.name,
        gender: s.gender || '-',
        email: s.user.email || '-',
        mobile: s.user.mobile || '-',
        admissionDate: s.admissionDate.toISOString().split('T')[0],
        status: s.user.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=student_directory.xlsx')
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function teachersReport(request: any, reply: any) {
  try {
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        user: { select: { name: true, email: true, mobile: true, status: true } },
        classSubjects: { include: { class: true, subject: true } },
        lectures: true,
        notes: true,
        remarks: true,
      },
      orderBy: { employeeId: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Teacher Progress & Analytics');

    sheet.columns = [
      { header: 'Employee ID', key: 'empId', width: 15 },
      { header: 'Teacher Name', key: 'name', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Expertise / Qualification', key: 'expertise', width: 25 },
      { header: 'Assigned Batches & Subjects', key: 'assigned', width: 35 },
      { header: 'Total Lectures', key: 'totalLectures', width: 15 },
      { header: 'Completed Lectures', key: 'completedLectures', width: 18 },
      { header: 'Lecture Completion %', key: 'completionRate', width: 20 },
      { header: 'Study Materials Uploaded', key: 'notesCount', width: 22 },
      { header: 'Student Remarks Given', key: 'remarksCount', width: 20 },
      { header: 'Account Status', key: 'status', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const t of teachers) {
      const totalLectures = t.lectures.length;
      const completedLectures = t.lectures.filter((l) => l.status === 'COMPLETED').length;
      const completionRate =
        totalLectures > 0 ? `${Math.round((completedLectures / totalLectures) * 100)}%` : 'N/A';

      const assignedList = t.classSubjects
        .map((cs) => `${cs.class.name} (${cs.subject.name})`)
        .join(', ');

      sheet.addRow({
        empId: t.employeeId,
        name: t.user.name,
        mobile: t.user.mobile || '-',
        email: t.user.email || '-',
        expertise: [t.qualification, t.subjectExpertise].filter(Boolean).join(' - ') || 'Faculty',
        assigned: assignedList || 'None',
        totalLectures,
        completedLectures,
        completionRate,
        notesCount: t.notes.length,
        remarksCount: t.remarks.length,
        status: t.user.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=teacher_progress_report.xlsx')
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    reply.code(500).send({ message: error.message });
  }
}

export async function syllabusReport(request: any, reply: any) {
  try {
    const { teacherId, subjectId } = request.query as {
      teacherId?: string;
      subjectId?: string;
    };

    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (subjectId) where.subjectId = subjectId;

    const plans = await prisma.lecturePlan.findMany({
      where,
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { name: true, email: true, mobile: true } },
            classSubjects: { include: { class: true } },
          },
        },
        items: {
          orderBy: [{ chapter: 'asc' }, { date: 'asc' }],
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Syllabus Progress & Audit');

    sheet.columns = [
      { header: 'Faculty Employee ID', key: 'empId', width: 18 },
      { header: 'Faculty Name', key: 'teacherName', width: 25 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Assigned Batches', key: 'batches', width: 30 },
      { header: 'Chapter / Unit', key: 'chapter', width: 35 },
      { header: 'Topic / Lecture Title', key: 'topic', width: 45 },
      { header: 'Scheduled Day', key: 'day', width: 15 },
      { header: 'Scheduled / Log Date', key: 'date', width: 18 },
      { header: 'Topic Status', key: 'status', width: 18 },
      { header: 'Chapter Completion %', key: 'chapPct', width: 20 },
      { header: 'Overall Subject Progress %', key: 'subjPct', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const plan of plans) {
      const totalPlanTopics = plan.items.length;
      const completedPlanTopics = plan.items.filter((i) => i.status === 'completed').length;
      const subjPct =
        totalPlanTopics > 0
          ? `${Math.round((completedPlanTopics / totalPlanTopics) * 100)}%`
          : '0%';

      const batches = plan.teacher.classSubjects
        .filter((cs) => cs.subjectId === plan.subjectId)
        .map((cs) => cs.class.name)
        .join(', ') || 'Assigned Batches';

      // Group by chapter
      const chapterGroups: Record<string, typeof plan.items> = {};
      for (const item of plan.items) {
        if (!chapterGroups[item.chapter]) chapterGroups[item.chapter] = [];
        chapterGroups[item.chapter].push(item);
      }

      for (const [chapName, cItems] of Object.entries(chapterGroups)) {
        const cTotal = cItems.length;
        const cDone = cItems.filter((i) => i.status === 'completed').length;
        const chapPct = `${Math.round((cDone / cTotal) * 100)}% (${cDone}/${cTotal} done)`;

        for (const item of cItems) {
          sheet.addRow({
            empId: plan.teacher.employeeId,
            teacherName: plan.teacher.user.name,
            subject: plan.subject.name,
            batches,
            chapter: chapName,
            topic: item.topic,
            day: item.day || 'Monday',
            date: item.date ? item.date.toISOString().split('T')[0] : 'N/A',
            status: item.status ? item.status.toUpperCase() : 'PENDING',
            chapPct,
            subjPct,
          });
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=syllabus_progress_audit_report.xlsx')
      .send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    console.error('syllabusReport error:', error);
    reply.code(500).send({ message: error.message });
  }
}

async function reportRoutes(app: FastifyInstance) {
  app.get('/attendance', { onRequest: [(app as any).authenticate] }, attendanceReport);
  app.get('/fees', { onRequest: [(app as any).authenticate] }, feesReport);
  app.get('/marks', { onRequest: [(app as any).authenticate] }, marksReport);
  app.get('/students', { onRequest: [(app as any).authenticate] }, studentsReport);
  app.get('/teachers', { onRequest: [(app as any).authenticate] }, teachersReport);
  app.get('/syllabus', { onRequest: [(app as any).authenticate] }, syllabusReport);
}

export default reportRoutes;
