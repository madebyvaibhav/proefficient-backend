import { PrismaClient, AttendanceStatus, FeeStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Full Demo Data Seed for Proefficient Institute of Learning...\n');

  // Disable FK checks and truncate tables
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  const tables = await prisma.$queryRaw<{ TABLE_NAME: string }[]>`
    SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
  `;
  for (const t of tables) {
    if (t.TABLE_NAME !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t.TABLE_NAME}\``);
    }
  }
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
  console.log('🧹 Cleaned existing data.\n');

  // 1. ACADEMIC CONFIG
  await prisma.academicConfig.create({
    data: {
      schoolName: 'Proefficient Institute of Learning',
      startTime: '08:00',
      endTime: '19:00',
      periodDuration: 50,
      periodsPerDay: 6,
      daysPerWeek: 6,
      timetableActive: true,
    },
  });
  console.log('✅ Institute Academic Configuration initialized.');

  // Password hashes
  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);
  const parentPassword = await bcrypt.hash('parent123', 10);

  // 2. MAIN ADMIN & SUB-ADMINS
  const mainAdmin = await prisma.user.create({
    data: {
      name: 'Dr. V. T. Patel',
      email: 'admin@gmail.com',
      mobile: '9000000001',
      password: adminPassword,
      role: 'admin',
      isMainAdmin: true,
      status: 'ACTIVE',
    },
  });

  const subAdmin1 = await prisma.user.create({
    data: {
      name: 'Hiren Joshi',
      email: 'hiren.subadmin@proefficient.edu',
      mobile: '9000000002',
      password: adminPassword,
      role: 'admin',
      isMainAdmin: false,
      permissions: ['masterData', 'attendance', 'timetable', 'notices'],
      status: 'ACTIVE',
    },
  });

  const subAdmin2 = await prisma.user.create({
    data: {
      name: 'Pooja Trivedi',
      email: 'pooja.subadmin@proefficient.edu',
      mobile: '9000000003',
      password: adminPassword,
      role: 'admin',
      isMainAdmin: false,
      permissions: ['fees', 'reports', 'tests'],
      status: 'ACTIVE',
    },
  });
  console.log('✅ Main Administrator & 2 Sub-Admins created.');

  // 3. BATCHES (CLASSES) & SECTIONS
  const class10 = await prisma.class.create({
    data: {
      name: 'Class 10 - Foundation & Boards',
      standard: 10,
      feeAmount: 35000,
    },
  });
  const sec10A = await prisma.section.create({
    data: { name: 'Batch A', classId: class10.id },
  });

  const class11JEE = await prisma.class.create({
    data: {
      name: 'Class 11 - JEE Advanced Target',
      standard: 11,
      feeAmount: 55000,
    },
  });
  const sec11A = await prisma.section.create({
    data: { name: 'Batch A', classId: class11JEE.id },
  });

  const class12NEET = await prisma.class.create({
    data: {
      name: 'Class 12 - NEET Medical Target',
      standard: 12,
      feeAmount: 60000,
    },
  });
  const sec12A = await prisma.section.create({
    data: { name: 'Batch A', classId: class12NEET.id },
  });

  const class9 = await prisma.class.create({
    data: {
      name: 'Class 9 - NTSE & Olympiad',
      standard: 9,
      feeAmount: 30000,
    },
  });
  const sec9A = await prisma.section.create({
    data: { name: 'Batch A', classId: class9.id },
  });
  console.log('✅ 4 Coaching Batches & Sections created.');

  // 4. SUBJECTS
  const subMath = await prisma.subject.create({
    data: { name: 'Mathematics', code: 'MATH-101' },
  });
  const subPhys = await prisma.subject.create({
    data: { name: 'Physics', code: 'PHY-101' },
  });
  const subChem = await prisma.subject.create({
    data: { name: 'Chemistry', code: 'CHEM-101' },
  });
  const subBio = await prisma.subject.create({
    data: { name: 'Biology', code: 'BIO-101' },
  });
  const subApti = await prisma.subject.create({
    data: { name: 'Mental Ability & English', code: 'MAT-101' },
  });
  console.log('✅ 5 Core Academic Subjects created.');

  // 5. FACULTY / TEACHERS
  const teacherUser1 = await prisma.user.create({
    data: {
      name: 'Prof. Suresh Sharma',
      email: 'teacher@gmail.com',
      mobile: '9876500001',
      password: teacherPassword,
      role: 'teacher',
      status: 'ACTIVE',
    },
  });
  const teacherProf1 = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser1.id,
      employeeId: 'FAC-1001',
      qualification: 'M.Sc., B.Ed. (14 Yrs Exp - Mathematics)',
      subjectExpertise: 'Algebra, Calculus, Trigonometry',
    },
  });

  const teacherUser2 = await prisma.user.create({
    data: {
      name: 'Dr. Ananya Patel',
      email: 'ananya.patel@proefficient.edu',
      mobile: '9876500002',
      password: teacherPassword,
      role: 'teacher',
      status: 'ACTIVE',
    },
  });
  const teacherProf2 = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser2.id,
      employeeId: 'FAC-1002',
      qualification: 'Ph.D. Physics (Ex-IIT Faculty, 10 Yrs Exp)',
      subjectExpertise: 'Mechanics, Electrodynamics, Modern Physics',
    },
  });

  const teacherUser3 = await prisma.user.create({
    data: {
      name: 'Prof. Vikram Singh',
      email: 'vikram.singh@proefficient.edu',
      mobile: '9876500003',
      password: teacherPassword,
      role: 'teacher',
      status: 'ACTIVE',
    },
  });
  const teacherProf3 = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser3.id,
      employeeId: 'FAC-1003',
      qualification: 'M.Tech Chemistry (Organic Specialist, 8 Yrs Exp)',
      subjectExpertise: 'Organic, Inorganic & Physical Chemistry',
    },
  });

  const teacherUser4 = await prisma.user.create({
    data: {
      name: 'Dr. Sneha Desai',
      email: 'sneha.desai@proefficient.edu',
      mobile: '9876500004',
      password: teacherPassword,
      role: 'teacher',
      status: 'ACTIVE',
    },
  });
  const teacherProf4 = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser4.id,
      employeeId: 'FAC-1004',
      qualification: 'M.Sc. Zoology, MD (Botany & Medical Entrance, 9 Yrs Exp)',
      subjectExpertise: 'Human Physiology, Genetics, Plant Kingdom',
    },
  });
  console.log('✅ 4 Expert Faculty Profiles created.');

  // 6. ASSIGN SUBJECTS & TEACHERS TO BATCHES
  // Class 10
  await prisma.classSubject.createMany({
    data: [
      { classId: class10.id, subjectId: subMath.id, teacherId: teacherProf1.id },
      { classId: class10.id, subjectId: subPhys.id, teacherId: teacherProf2.id },
      { classId: class10.id, subjectId: subChem.id, teacherId: teacherProf3.id },
      { classId: class10.id, subjectId: subBio.id, teacherId: teacherProf4.id },
    ],
  });

  // Class 11 JEE
  await prisma.classSubject.createMany({
    data: [
      { classId: class11JEE.id, subjectId: subMath.id, teacherId: teacherProf1.id },
      { classId: class11JEE.id, subjectId: subPhys.id, teacherId: teacherProf2.id },
      { classId: class11JEE.id, subjectId: subChem.id, teacherId: teacherProf3.id },
    ],
  });

  // Class 12 NEET
  await prisma.classSubject.createMany({
    data: [
      { classId: class12NEET.id, subjectId: subPhys.id, teacherId: teacherProf2.id },
      { classId: class12NEET.id, subjectId: subChem.id, teacherId: teacherProf3.id },
      { classId: class12NEET.id, subjectId: subBio.id, teacherId: teacherProf4.id },
    ],
  });

  // Class 9
  await prisma.classSubject.createMany({
    data: [
      { classId: class9.id, subjectId: subMath.id, teacherId: teacherProf1.id },
      { classId: class9.id, subjectId: subPhys.id, teacherId: teacherProf2.id },
      { classId: class9.id, subjectId: subApti.id, teacherId: teacherProf1.id },
    ],
  });
  console.log('✅ Subjects Assigned to Teachers and Batches.');

  // 7. STUDENTS & PARENTS
  interface StudentData {
    name: string;
    email: string;
    mobile: string;
    roll: string;
    classId: string;
    sectionId: string;
    parentName: string;
    parentEmail: string;
    parentMobile: string;
    feeTotal: number;
    feePaid: number;
  }

  const studentsList: StudentData[] = [
    {
      name: 'Aarav Mehta',
      email: 'student@gmail.com',
      mobile: '9825000001',
      roll: 'STU-1001',
      classId: class10.id,
      sectionId: sec10A.id,
      parentName: 'Rajesh Mehta',
      parentEmail: 'parent@gmail.com',
      parentMobile: '9712000001',
      feeTotal: 35000,
      feePaid: 25000,
    },
    {
      name: 'Diya Shah',
      email: 'diya.shah@proefficient.edu',
      mobile: '9825000002',
      roll: 'STU-1002',
      classId: class10.id,
      sectionId: sec10A.id,
      parentName: 'Bhavna Shah',
      parentEmail: 'bhavna.shah@gmail.com',
      parentMobile: '9712000002',
      feeTotal: 35000,
      feePaid: 35000,
    },
    {
      name: 'Rohan Verma',
      email: 'rohan.verma@proefficient.edu',
      mobile: '9825000003',
      roll: 'STU-1101',
      classId: class11JEE.id,
      sectionId: sec11A.id,
      parentName: 'Sanjay Verma',
      parentEmail: 'sanjay.verma@gmail.com',
      parentMobile: '9712000003',
      feeTotal: 55000,
      feePaid: 30000,
    },
    {
      name: 'Ishita Joshi',
      email: 'ishita.joshi@proefficient.edu',
      mobile: '9825000004',
      roll: 'STU-1102',
      classId: class11JEE.id,
      sectionId: sec11A.id,
      parentName: 'Kishore Joshi',
      parentEmail: 'kishore.joshi@gmail.com',
      parentMobile: '9712000004',
      feeTotal: 55000,
      feePaid: 55000,
    },
    {
      name: 'Kabir Patel',
      email: 'kabir.patel@proefficient.edu',
      mobile: '9825000005',
      roll: 'STU-1201',
      classId: class12NEET.id,
      sectionId: sec12A.id,
      parentName: 'Nitin Patel',
      parentEmail: 'nitin.patel@gmail.com',
      parentMobile: '9712000005',
      feeTotal: 60000,
      feePaid: 40000,
    },
    {
      name: 'Ananya Roy',
      email: 'ananya.roy@proefficient.edu',
      mobile: '9825000006',
      roll: 'STU-1202',
      classId: class12NEET.id,
      sectionId: sec12A.id,
      parentName: 'Debabrata Roy',
      parentEmail: 'debabrata.roy@gmail.com',
      parentMobile: '9712000006',
      feeTotal: 60000,
      feePaid: 60000,
    },
    {
      name: 'Manav Bhatt',
      email: 'manav.bhatt@proefficient.edu',
      mobile: '9825000007',
      roll: 'STU-0901',
      classId: class9.id,
      sectionId: sec9A.id,
      parentName: 'Pankaj Bhatt',
      parentEmail: 'pankaj.bhatt@gmail.com',
      parentMobile: '9712000007',
      feeTotal: 30000,
      feePaid: 15000,
    },
  ];

  const createdStudentProfiles: any[] = [];

  for (const s of studentsList) {
    // Student User
    const stuUser = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        mobile: s.mobile,
        password: studentPassword,
        role: 'student',
        status: 'ACTIVE',
      },
    });

    const stuProfile = await prisma.studentProfile.create({
      data: {
        userId: stuUser.id,
        rollNumber: s.roll,
        classId: s.classId,
        sectionId: s.sectionId,
        admissionDate: new Date('2026-06-15'),
      },
    });
    createdStudentProfiles.push({ ...stuProfile, name: s.name, classId: s.classId, sectionId: s.sectionId });

    // Parent User
    let parentUser = await prisma.user.findFirst({ where: { mobile: s.parentMobile } });
    if (!parentUser) {
      parentUser = await prisma.user.create({
        data: {
          name: s.parentName,
          email: s.parentEmail,
          mobile: s.parentMobile,
          password: parentPassword,
          role: 'parent',
          status: 'ACTIVE',
        },
      });
    }

    // Link Parent to Student
    await prisma.parentStudent.create({
      data: {
        parentId: parentUser.id,
        studentId: stuProfile.id,
        relation: 'Parent / Guardian',
      },
    });

    // Fee Ledger
    const dueAmount = s.feeTotal - s.feePaid;
    await prisma.fee.create({
      data: {
        studentId: stuProfile.id,
        title: 'Annual Academic & Tuition Fee',
        totalAmount: s.feeTotal,
        paidAmount: s.feePaid,
        dueDate: new Date('2026-10-31'),
        status: dueAmount === 0 ? FeeStatus.PAID : s.feePaid > 0 ? FeeStatus.PARTIAL : FeeStatus.PENDING,
      },
    });
  }
  console.log('✅ 7 Students & 7 Parents created with verified links and Fee records.');

  // 8. LECTURES & ATTENDANCE RECORDS (Past 5 Days)
  const today = new Date();
  for (let d = 4; d >= 0; d--) {
    const lectureDate = new Date();
    lectureDate.setDate(today.getDate() - d);
    lectureDate.setHours(9, 0, 0, 0);

    // Create Lecture for Class 10
    const lec10 = await prisma.lecture.create({
      data: {
        sectionId: sec10A.id,
        subjectId: subMath.id,
        teacherId: teacherProf1.id,
        startTime: lectureDate,
        topic: `Algebra Chapter Concept ${5 - d}`,
      },
    });

    // Mark attendance for Class 10 students
    const class10Stus = createdStudentProfiles.filter(s => s.classId === class10.id);
    for (let i = 0; i < class10Stus.length; i++) {
      const stu = class10Stus[i];
      const status = (d === 1 && i === 1) ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
      await prisma.attendance.create({
        data: {
          lectureId: lec10.id,
          studentId: stu.id,
          status: status,
        },
      });
    }

    // Create Lecture for Class 11
    const lec11 = await prisma.lecture.create({
      data: {
        sectionId: sec11A.id,
        subjectId: subPhys.id,
        teacherId: teacherProf2.id,
        startTime: lectureDate,
        topic: `Mechanics & Kinematics Session ${5 - d}`,
      },
    });

    const class11Stus = createdStudentProfiles.filter(s => s.classId === class11JEE.id);
    for (let i = 0; i < class11Stus.length; i++) {
      const stu = class11Stus[i];
      const status = (d === 2 && i === 0) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
      await prisma.attendance.create({
        data: {
          lectureId: lec11.id,
          studentId: stu.id,
          status: status,
        },
      });
    }
  }
  console.log('✅ Historical Lectures and Student Attendance records seeded.');

  // 9. TESTS & MARKS
  // Test 1: Class 11 JEE
  const test1 = await prisma.test.create({
    data: {
      title: 'JEE Advanced Weekly Mock 01',
      classId: class11JEE.id,
      sectionId: sec11A.id,
      subjectId: subPhys.id,
      totalMarks: 100,
      testDate: new Date('2026-08-10'),
    },
  });

  const class11Students = createdStudentProfiles.filter(s => s.classId === class11JEE.id);
  if (class11Students[0]) {
    await prisma.mark.create({
      data: { testId: test1.id, studentId: class11Students[0].id, marks: 88, rank: 2 },
    });
  }
  if (class11Students[1]) {
    await prisma.mark.create({
      data: { testId: test1.id, studentId: class11Students[1].id, marks: 94, rank: 1 },
    });
  }

  // Test 2: Class 10 Foundation
  const test2 = await prisma.test.create({
    data: {
      title: 'Mathematics Unit Test - Quadratic Equations',
      classId: class10.id,
      sectionId: sec10A.id,
      subjectId: subMath.id,
      totalMarks: 50,
      testDate: new Date('2026-08-12'),
    },
  });

  const class10Students = createdStudentProfiles.filter(s => s.classId === class10.id);
  if (class10Students[0]) {
    await prisma.mark.create({
      data: { testId: test2.id, studentId: class10Students[0].id, marks: 46, rank: 2 },
    });
  }
  if (class10Students[1]) {
    await prisma.mark.create({
      data: { testId: test2.id, studentId: class10Students[1].id, marks: 49, rank: 1 },
    });
  }

  // Test 3: Class 12 NEET
  const test3 = await prisma.test.create({
    data: {
      title: 'NEET Grand Mock - Human Physiology',
      classId: class12NEET.id,
      sectionId: sec12A.id,
      subjectId: subBio.id,
      totalMarks: 360,
      testDate: new Date('2026-08-14'),
    },
  });

  const class12Students = createdStudentProfiles.filter(s => s.classId === class12NEET.id);
  if (class12Students[0]) {
    await prisma.mark.create({
      data: { testId: test3.id, studentId: class12Students[0].id, marks: 325, rank: 2 },
    });
  }
  if (class12Students[1]) {
    await prisma.mark.create({
      data: { testId: test3.id, studentId: class12Students[1].id, marks: 342, rank: 1 },
    });
  }
  console.log('✅ 3 Comprehensive Exams & Student Marks seeded.');

  // 10. TIMETABLE SLOTS
  const days = [1, 2, 3, 4, 5, 6];
  for (const day of days) {
    // Class 10 Periods
    await prisma.timetableEntry.createMany({
      data: [
        {
          sectionId: sec10A.id,
          subjectId: subMath.id,
          teacherId: teacherProf1.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '08:50',
          room: 'Lecture Hall 1',
          isActive: true,
        },
        {
          sectionId: sec10A.id,
          subjectId: subPhys.id,
          teacherId: teacherProf2.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '09:50',
          room: 'Lecture Hall 1',
          isActive: true,
        },
        {
          sectionId: sec10A.id,
          subjectId: subChem.id,
          teacherId: teacherProf3.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '10:50',
          room: 'Lecture Hall 1',
          isActive: true,
        },
      ],
    });

    // Class 11 JEE Periods
    await prisma.timetableEntry.createMany({
      data: [
        {
          sectionId: sec11A.id,
          subjectId: subPhys.id,
          teacherId: teacherProf2.id,
          dayOfWeek: day,
          startTime: '14:00',
          endTime: '15:15',
          room: 'JEE Room 3',
          isActive: true,
        },
        {
          sectionId: sec11A.id,
          subjectId: subMath.id,
          teacherId: teacherProf1.id,
          dayOfWeek: day,
          startTime: '15:30',
          endTime: '16:45',
          room: 'JEE Room 3',
          isActive: true,
        },
        {
          sectionId: sec11A.id,
          subjectId: subChem.id,
          teacherId: teacherProf3.id,
          dayOfWeek: day,
          startTime: '17:00',
          endTime: '18:15',
          room: 'JEE Room 3',
          isActive: true,
        },
      ],
    });
  }
  console.log('✅ Daily Timetable Schedule populated for Monday through Saturday.');

  // 11. NOTICE BOARD BROADCASTS
  await prisma.notice.createMany({
    data: [
      {
        title: '📢 Weekly Grand Mock Test Series - Sunday 9:00 AM',
        content: 'All Class 10, 11 (JEE) and 12 (NEET) batches are hereby notified that the All-Gujarat Mock Test Series will be conducted this Sunday. Reach 15 mins prior.',
        senderId: mainAdmin.id,
        senderRole: 'admin',
        visibility: 'all',
        date: new Date(),
      },
      {
        title: '👨‍👩‍👧 Monthly Parent-Teacher Academic Review (PTM)',
        content: 'Dear Parents, PTM for assessing progress, attendance and recent unit test marks is scheduled for Saturday 4 PM to 7 PM. One-on-one session with faculties.',
        senderId: mainAdmin.id,
        senderRole: 'admin',
        visibility: 'parents',
        date: new Date(),
      },
      {
        title: '📚 Advanced Question Bank & Formula Handbooks Available',
        content: 'Students can collect the revised Physics and Chemistry Formula Handbook from the reception or download it directly under the Study Material section.',
        senderId: mainAdmin.id,
        senderRole: 'admin',
        visibility: 'students',
        date: new Date(),
      },
      {
        title: '💼 Faculty Meeting: Syllabus Pace & DPP Discussion',
        content: 'All senior faculties are requested to assemble in Conference Room 1 on Friday at 6:30 PM for monthly curriculum audit and DPP status review.',
        senderId: mainAdmin.id,
        senderRole: 'admin',
        visibility: 'teachers',
        date: new Date(),
      },
    ],
  });
  console.log('✅ 4 Announcements broadcasted to All, Parents, Students & Teachers.');

  console.log('\n🎉 ALL SECTIONS SEEDED SUCCESSFULLY FOR PROEFFICIENT INSTITUTE OF LEARNING!\n');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('👑 MAIN ADMIN:        admin@gmail.com / admin123');
  console.log('🛡️ SUB-ADMIN (Academics): hiren.subadmin@proefficient.edu / admin123');
  console.log('🛡️ SUB-ADMIN (Accounts):  pooja.subadmin@proefficient.edu / admin123');
  console.log('💼 TEACHER 1 (Maths):   teacher@gmail.com / teacher123');
  console.log('💼 TEACHER 2 (Physics): ananya.patel@proefficient.edu / teacher123');
  console.log('🎓 STUDENT (Class 10):  student@gmail.com / student123 (Mobile: 9825000001)');
  console.log('🎓 STUDENT (Class 11):  rohan.verma@proefficient.edu / student123 (Mobile: 9825000003)');
  console.log('👤 PARENT (Aarav):      parent@gmail.com / parent123 (Mobile: 9712000001)');
  console.log('👤 PARENT (Rohan):      sanjay.verma@gmail.com / parent123 (Mobile: 9712000003)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

main()
  .catch(e => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
