import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏫 Seeding School ERP Database...');

  // Clear existing data
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  const tables = await prisma.$queryRaw<{ TABLE_NAME: string }[]>`
    SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
  `;
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t.TABLE_NAME}\``);
  }
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

  // ─── 1. Create Admin User ───
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@proefficient.edu',
      mobile: '9000000001',
      password: adminPassword,
      role: 'admin',
      isMainAdmin: true,
    },
  });
  console.log('✅ Admin created: admin@proefficient.edu / admin123');

  // ─── 2. Create Classes (1-12) ───
  const classes = [];
  for (let std = 1; std <= 12; std++) {
    const cls = await prisma.class.create({
      data: {
        name: `Class ${std}`,
        standard: std,
      },
    });
    classes.push(cls);
  }
  console.log('✅ Classes 1-12 created');

  // ─── 3. Create Sections (A, B for each class) ───
  const sections: any[] = [];
  for (const cls of classes) {
    for (const secName of ['A', 'B']) {
      const sec = await prisma.section.create({
        data: {
          name: secName,
          classId: cls.id,
        },
      });
      sections.push({ ...sec, standard: cls.standard });
    }
  }
  console.log('✅ Sections A, B created for each class');

  // ─── 4. Create Subjects ───
  const subjectNames = [
    { name: 'English', code: 'ENG' },
    { name: 'Hindi', code: 'HIN' },
    { name: 'Mathematics', code: 'MAT' },
    { name: 'Science', code: 'SCI' },
    { name: 'Social Science', code: 'SST' },
    { name: 'Computer Science', code: 'CS' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHE' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Environmental Studies', code: 'EVS' },
    { name: 'General Knowledge', code: 'GK' },
    { name: 'Physical Education', code: 'PE' },
    { name: 'Art & Craft', code: 'ART' },
    { name: 'Music', code: 'MUS' },
  ];

  const subjectMap: Record<string, string> = {};
  for (const s of subjectNames) {
    const sub = await prisma.subject.create({
      data: { name: s.name, code: s.code },
    });
    subjectMap[s.code] = sub.id;
  }
  console.log('✅ 14 subjects created');

  // ─── 5. Map Subjects to Classes ───
  // Primary (1-5): English, Hindi, Math, EVS, GK, Art, Music, PE
  const primarySubjects = ['ENG', 'HIN', 'MAT', 'EVS', 'GK', 'ART', 'MUS', 'PE'];
  // Middle (6-8): English, Hindi, Math, Science, SST, CS, PE
  const middleSubjects = ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'CS', 'PE'];
  // Secondary (9-10): English, Hindi, Math, Science, SST, CS, PE
  const secondarySubjects = ['ENG', 'HIN', 'MAT', 'SCI', 'SST', 'CS', 'PE'];
  // Senior (11-12): English, Physics, Chemistry, Math, CS, PE
  const seniorSubjects = ['ENG', 'PHY', 'CHE', 'MAT', 'CS', 'PE'];

  for (const cls of classes) {
    let subCodes: string[];
    if (cls.standard <= 5) subCodes = primarySubjects;
    else if (cls.standard <= 8) subCodes = middleSubjects;
    else if (cls.standard <= 10) subCodes = secondarySubjects;
    else subCodes = seniorSubjects;

    for (const code of subCodes) {
      await prisma.classSubject.create({
        data: {
          classId: cls.id,
          subjectId: subjectMap[code],
        },
      });
    }
  }
  console.log('✅ Subject-class mappings created');

  // ─── 6. Create Sample Teachers ───
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacherData = [
    { name: 'Rajesh Kumar', email: 'rajesh@proefficient.edu', mobile: '9000000002', empId: 'TCH001' },
    { name: 'Priya Sharma', email: 'priya@proefficient.edu', mobile: '9000000003', empId: 'TCH002' },
    { name: 'Amit Singh', email: 'amit@proefficient.edu', mobile: '9000000004', empId: 'TCH003' },
  ];

  for (const t of teacherData) {
    await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        mobile: t.mobile,
        password: teacherPassword,
        role: 'teacher',
        teacherProfile: {
          create: {
            employeeId: t.empId,
            qualification: 'M.Ed',
          },
        },
      },
    });
  }
  console.log('✅ 3 teachers created (password: teacher123)');

  // ─── 7. Create Sample Students ───
  const studentPassword = await bcrypt.hash('student123', 10);

  // Get Class 10-A section
  const class10 = classes.find(c => c.standard === 10)!;
  const section10A = sections.find(s => s.standard === 10 && s.name === 'A')!;

  const studentData = [
    { name: 'Aarav Patel', email: 'aarav@proefficient.edu', mobile: '9100000001', roll: 'STU001' },
    { name: 'Diya Gupta', email: 'diya@proefficient.edu', mobile: '9100000002', roll: 'STU002' },
    { name: 'Vihaan Reddy', email: 'vihaan@proefficient.edu', mobile: '9100000003', roll: 'STU003' },
    { name: 'Ananya Iyer', email: 'ananya@proefficient.edu', mobile: '9100000004', roll: 'STU004' },
    { name: 'Arjun Mishra', email: 'arjun@proefficient.edu', mobile: '9100000005', roll: 'STU005' },
  ];

  const studentIds: string[] = [];
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        mobile: s.mobile,
        password: studentPassword,
        role: 'student',
        studentProfile: {
          create: {
            rollNumber: s.roll,
            classId: class10.id,
            sectionId: section10A.id,
            gender: ['Aarav', 'Vihaan', 'Arjun'].includes(s.name.split(' ')[0]) ? 'Male' : 'Female',
          },
        },
      },
    });
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile) studentIds.push(profile.id);
  }
  console.log('✅ 5 students created in Class 10-A (password: student123)');

  // ─── 8. Create Sample Parents ───
  const parentPassword = await bcrypt.hash('parent123', 10);

  const parent1 = await prisma.user.create({
    data: {
      name: 'Vikram Patel',
      email: 'vikram.parent@proefficient.edu',
      mobile: '9200000001',
      password: parentPassword,
      role: 'parent',
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      name: 'Sunita Gupta',
      email: 'sunita.parent@proefficient.edu',
      mobile: '9200000002',
      password: parentPassword,
      role: 'parent',
    },
  });

  // Link parents to students
  if (studentIds.length >= 2) {
    await prisma.parentStudent.create({
      data: { parentId: parent1.id, studentId: studentIds[0], relation: 'FATHER' },
    });
    await prisma.parentStudent.create({
      data: { parentId: parent2.id, studentId: studentIds[1], relation: 'MOTHER' },
    });
  }
  console.log('✅ 2 parents created and linked (password: parent123)');

  // ─── 9. Create Rooms ───
  const rooms = [
    { number: '101', type: 'Classroom', capacity: 40 },
    { number: '102', type: 'Classroom', capacity: 40 },
    { number: '103', type: 'Classroom', capacity: 40 },
    { number: 'Lab-1', type: 'Lab', capacity: 30 },
    { number: 'Lab-2', type: 'Lab', capacity: 30 },
    { number: 'Library', type: 'Library', capacity: 50 },
  ];

  for (const r of rooms) {
    await prisma.room.create({ data: r });
  }
  console.log('✅ 6 rooms created');

  // ─── 10. Create Academic Config ───
  await prisma.academicConfig.create({
    data: {
      academicYear: '2026-2027',
      startTime: '08:00',
      endTime: '14:00',
      periodDuration: 40,
      periodsPerDay: 8,
      daysPerWeek: 6,
      breaks: JSON.stringify([
        { after: 2, duration: 15, label: 'Short Break' },
        { after: 4, duration: 30, label: 'Lunch Break' },
      ]),
      workingDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
      timetableActive: false,
      schoolName: 'Proefficient Institute of Learning',
    },
  });
  console.log('✅ Academic config created');

  console.log('\n🎓 Proefficient Institute of Learning ERP Seeding Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:    admin@proefficient.edu / admin123');
  console.log('Teacher:  rajesh@proefficient.edu / teacher123');
  console.log('Student:  aarav@proefficient.edu / student123');
  console.log('Parent:   vikram.parent@proefficient.edu / parent123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
