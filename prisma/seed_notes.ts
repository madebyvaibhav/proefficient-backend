import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNotes() {
  console.log('Seeding study materials...');
  const classes = await prisma.class.findMany({ include: { sections: true } });
  const mathSub = await prisma.subject.findFirst({ where: { name: { contains: 'Math' } } });
  const physSub = await prisma.subject.findFirst({ where: { name: { contains: 'Phys' } } });
  const chemSub = await prisma.subject.findFirst({ where: { name: { contains: 'Chem' } } });
  const bioSub = await prisma.subject.findFirst({ where: { name: { contains: 'Bio' } } });
  const teachers = await prisma.teacherProfile.findMany();

  const c10 = classes.find(c => c.standard === 10);
  const c11 = classes.find(c => c.standard === 11);
  const c12 = classes.find(c => c.standard === 12);

  if (c10 && c10.sections[0] && mathSub && teachers[0]) {
    await prisma.note.create({
      data: {
        sectionId: c10.sections[0].id,
        subjectId: mathSub.id,
        teacherId: teachers[0].id,
        title: 'Quadratic Equations & Polynomials - Complete DPP & Summary',
        fileUrl: 'https://proefficient.edu/materials/math-10-quad.pdf',
        fileType: 'PDF',
      },
    });
  }

  if (c11 && c11.sections[0] && physSub && teachers[1]) {
    await prisma.note.create({
      data: {
        sectionId: c11.sections[0].id,
        subjectId: physSub.id,
        teacherId: teachers[1].id,
        title: 'Kinematics in 1D & 2D - JEE Advanced Problems & Solutions',
        fileUrl: 'https://proefficient.edu/materials/phy-11-kinematics.pdf',
        fileType: 'PDF',
      },
    });
  }

  if (c11 && c11.sections[0] && chemSub && teachers[2]) {
    await prisma.note.create({
      data: {
        sectionId: c11.sections[0].id,
        subjectId: chemSub.id,
        teacherId: teachers[2].id,
        title: 'Chemical Bonding & Molecular Structure - Formula Handbook',
        fileUrl: 'https://proefficient.edu/materials/chem-11-bonding.pdf',
        fileType: 'DOCUMENT',
      },
    });
  }

  if (c12 && c12.sections[0] && bioSub && teachers[3]) {
    await prisma.note.create({
      data: {
        sectionId: c12.sections[0].id,
        subjectId: bioSub.id,
        teacherId: teachers[3].id,
        title: 'Human Physiology & Genetics - Medical Entrance Mind-Maps',
        fileUrl: 'https://proefficient.edu/materials/bio-12-physio.pdf',
        fileType: 'PDF',
      },
    });
  }

  console.log('✅ 4 Study Materials seeded successfully!');
}

seedNotes()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
