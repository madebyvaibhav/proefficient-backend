import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning Database for Proefficient Institute of Learning...');

  // Disable foreign key checks and truncate all tables
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
  console.log('✅ All existing data erased cleanly.');

  // Password hashes
  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);
  const parentPassword = await bcrypt.hash('parent123', 10);

  // 1. MAIN ADMIN USER
  const admin = await prisma.user.create({
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
  console.log('✅ 1. Admin Account Initialized: admin@gmail.com / admin123');

  // 2. ACADEMIC CONFIG
  await prisma.academicConfig.create({
    data: {
      schoolName: 'Proefficient Institute of Learning',
      startTime: '08:00',
      endTime: '19:00',
      periodDuration: 60,
      periodsPerDay: 6,
      daysPerWeek: 6,
      timetableActive: true,
    },
  });
  console.log('✅ Academic Configuration created.');

  // 3. CLASS & SECTION
  const standardClass = await prisma.class.create({
    data: {
      name: 'Class 10 - Foundation & Boards',
      standard: 10,
      feeAmount: 35000,
    },
  });

  const sectionA = await prisma.section.create({
    data: {
      name: 'Batch A',
      classId: standardClass.id,
    },
  });
  console.log('✅ Class & Section created: Class 10 - Foundation & Boards (Batch A)');

  // 4. SUBJECT
  const subjectMath = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      code: 'MATH-101',
    },
  });

  // 5. TEACHER
  const teacherUser = await prisma.user.create({
    data: {
      name: 'Prof. Suresh Sharma',
      email: 'teacher@gmail.com',
      mobile: '9876500001',
      password: teacherPassword,
      role: 'teacher',
      status: 'ACTIVE',
    },
  });

  const teacherProfile = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser.id,
      employeeId: 'FAC-1001',
      qualification: 'M.Sc., B.Ed. (14 Yrs Exp - Mathematics)',
      subjectExpertise: 'Algebra, Calculus, Trigonometry',
    },
  });

  await prisma.classSubject.create({
    data: {
      classId: standardClass.id,
      subjectId: subjectMath.id,
      teacherId: teacherProfile.id,
    },
  });
  console.log('✅ 2. Teacher Account Initialized: teacher@gmail.com / teacher123');

  // 6. STUDENT
  const studentUser = await prisma.user.create({
    data: {
      name: 'Aarav Mehta',
      email: 'student@gmail.com',
      mobile: '9825000001',
      password: studentPassword,
      role: 'student',
      status: 'ACTIVE',
    },
  });

  const studentProfile = await prisma.studentProfile.create({
    data: {
      userId: studentUser.id,
      rollNumber: 'STU-1001',
      classId: standardClass.id,
      sectionId: sectionA.id,
      admissionDate: new Date('2026-06-15'),
    },
  });
  console.log('✅ 3. Student Account Initialized: student@gmail.com / student123');

  // 7. PARENT
  const parentUser = await prisma.user.create({
    data: {
      name: 'Rajesh Mehta',
      email: 'parent@gmail.com',
      mobile: '9712000001',
      password: parentPassword,
      role: 'parent',
      status: 'ACTIVE',
    },
  });

  await prisma.parentStudent.create({
    data: {
      parentId: parentUser.id,
      studentId: studentProfile.id,
      relation: 'FATHER',
    },
  });
  console.log('✅ 4. Parent Account Initialized: parent@gmail.com / parent123');

  console.log('\n🎓 Proefficient Institute of Learning Accounts Ready!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 Admin:   admin@gmail.com   / admin123   (or 9000000001)');
  console.log('💼 Teacher: teacher@gmail.com / teacher123 (or 9876500001)');
  console.log('🎓 Student: student@gmail.com / student123 (or 9825000001)');
  console.log('👤 Parent:  parent@gmail.com  / parent123  (or 9712000001)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during clean seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
