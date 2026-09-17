import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate a random alphanumeric password with a role prefix
function generateRandomPassword(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I,O,0,1
  let code = '';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${code}`;
}

// Safely parse dates in various formats (ISO, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput !== 'string') return null;
  const str = dateInput.trim();
  if (!str) return null;

  // Try standard ISO or standard new Date()
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try parsing DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);

    // If DD-MM-YYYY (e.g. 15/08/2005)
    if (p3 >= 1900 && p3 <= 2100 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
      const parsed = new Date(p3, p2 - 1, p1);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // If YYYY-MM-DD (e.g. 2005-08-15)
    if (p1 >= 1900 && p1 <= 2100 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
      const parsed = new Date(p1, p2 - 1, p3);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

export async function enrollStudent(request: any, reply: any) {
  try {
    const {
      name, email, mobile, password, avatar,
      rollNumber, classId, sectionId, gender, dob, address, admissionDate,
      existingParentId, parentName, parentMobile, parentEmail, parentPassword, parentRelation,
      // Official Admission Form Fields
      fatherName, fatherOccupation, fatherQualification, fatherPhone,
      motherName, motherOccupation, motherQualification, motherPhone,
      schoolName, board, previousPercentage,
      medicalIssue, bloodGroup, referenceDetails,
      appliedClass, dateOfJoining,
      totalFee, finalFeeAfterScholarship, installments
    } = request.body;

    if (!name || !mobile || !classId) {
      return reply.status(400).send({ message: 'Name, mobile and classId are required.' });
    }

    // Determine section
    let assignedSectionId = sectionId;
    if (!assignedSectionId) {
      const section = await prisma.section.findFirst({ where: { classId } });
      if (section) {
        assignedSectionId = section.id;
      } else {
        const newSection = await prisma.section.create({ data: { classId, name: 'A' } });
        assignedSectionId = newSection.id;
      }
    }

    const assignedRollNumber = rollNumber || `PIL-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const studentPass = password && password.trim() ? password.trim() : generateRandomPassword('STU');
    const studentHashedPass = await bcrypt.hash(studentPass, 10);

    const admissionForm = {
      fatherName: fatherName || parentName || null,
      fatherOccupation: fatherOccupation || null,
      fatherQualification: fatherQualification || null,
      fatherPhone: fatherPhone || parentMobile || null,
      motherName: motherName || null,
      motherOccupation: motherOccupation || null,
      motherQualification: motherQualification || null,
      motherPhone: motherPhone || null,
      schoolName: schoolName || null,
      board: board || null,
      previousPercentage: previousPercentage || null,
      medicalIssue: medicalIssue || '--',
      bloodGroup: bloodGroup || '--',
      referenceDetails: referenceDetails || 'Social Media',
      appliedClass: appliedClass || null,
      dateOfJoining: dateOfJoining || admissionDate || new Date().toISOString().split('T')[0],
      totalFee: totalFee != null ? Number(totalFee) : null,
      finalFeeAfterScholarship: finalFeeAfterScholarship != null ? Number(finalFeeAfterScholarship) : null,
      installments: Array.isArray(installments) ? installments : [],
    };

    // Check for duplicate student mobile before entering transaction
    if (mobile) {
      const existingStudent = await prisma.user.findFirst({ where: { mobile, role: 'student' } });
      if (existingStudent) {
        return reply.status(400).send({ message: `A student with mobile number ${mobile} already exists.` });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Student User with complete admission details
      const studentUser = await tx.user.create({
        data: {
          name,
          email,
          mobile,
          password: studentHashedPass,
          role: 'student',
          avatar: avatar || null,
          permissions: { admissionForm },
        }
      });

      // 2. Create Student Profile
      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          rollNumber: assignedRollNumber,
          classId,
          sectionId: assignedSectionId,
          gender: gender || null,
          dob: parseFlexibleDate(dob),
          address: address || null,
          admissionDate: parseFlexibleDate(admissionDate) || new Date(),
        },
        include: {
          class: true,
          section: true,
        }
      });

      // 3. Auto-create Fee Installment records if provided
      if (Array.isArray(installments) && installments.length > 0) {
        for (const inst of installments) {
          if (inst.amount && Number(inst.amount) > 0) {
            await tx.fee.create({
              data: {
                studentId: studentProfile.id,
                title: `Admission Installment ${inst.no || 1}`,
                totalAmount: Number(inst.amount),
                paidAmount: inst.status === 'Paid' ? Number(inst.amount) : 0,
                dueDate: parseFlexibleDate(inst.dateSlot) || new Date(),
                status: inst.status === 'Paid' ? 'PAID' : 'PENDING',
              }
            });
          }
        }
      }

      // 4. Handle Parent
      let parentUserId = existingParentId;
      let finalParentPass = '';
      const pName = parentName || fatherName;
      const pMobile = parentMobile || fatherPhone;
      
      if (!parentUserId && pName && pMobile) {
        // Check if a parent with this mobile already exists
        const existingParent = await tx.user.findFirst({
          where: { mobile: pMobile, role: 'parent' }
        });

        if (existingParent) {
          // Reuse existing parent account instead of creating duplicate
          parentUserId = existingParent.id;
          finalParentPass = '(existing account)';
        } else {
          finalParentPass = parentPassword && parentPassword.trim() ? parentPassword.trim() : generateRandomPassword('PAR');
          const parentHashedPass = await bcrypt.hash(finalParentPass, 10);
          
          const parentUser = await tx.user.create({
            data: {
              name: pName,
              email: parentEmail || null,
              mobile: pMobile,
              password: parentHashedPass,
              role: 'parent',
            }
          });
          parentUserId = parentUser.id;
        }
      }

      let parentLink = null;
      let parentChildCount = 0;
      if (parentUserId) {
        parentLink = await tx.parentStudent.create({
          data: {
            parentId: parentUserId,
            studentId: studentProfile.id,
            relation: parentRelation || 'Father'
          },
          include: {
            parent: true
          }
        });

        // Count total children linked to this parent
        parentChildCount = await tx.parentStudent.count({
          where: { parentId: parentUserId }
        });

        // Notify Parent (different message for existing vs new parent)
        const notifBody = parentChildCount > 1
          ? `Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. You now have ${parentChildCount} children enrolled at Proefficient Institute.`
          : `Welcome! Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. Admission form verified.`;

        await tx.notification.create({
          data: {
            userId: parentUserId,
            title: parentChildCount > 1 ? 'New Child Enrolled!' : 'Welcome to Proefficient Institute!',
            body: notifBody,
            type: 'SYSTEM'
          }
        });
      }

      // 5. Notify Student
      await tx.notification.create({
        data: {
          userId: studentUser.id,
          title: 'Welcome to Proficient Institute of Learning!',
          body: `You have been enrolled in ${studentProfile.class.name}. Official admission form generated.`,
          type: 'SYSTEM'
        }
      });

      return {
        studentProfile,
        studentUser,
        parentLink,
        credentials: {
          studentLogin: studentUser.mobile,
          studentPassword: studentPass,
          parentLogin: parentLink ? parentLink.parent.mobile : null,
          parentPassword: finalParentPass || (existingParentId ? 'Existing Account' : null),
          parentChildCount: parentChildCount,
          isExistingParent: finalParentPass === '(existing account)' || !!existingParentId
        }
      };
    });

    return reply.status(201).send({
      message: 'Student enrolled successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Enrollment Error:', error);
    return reply.status(500).send({ message: error.message || 'Error enrolling student' });
  }
}

export async function getAdmissionHistory(request: any, reply: any) {
  try {
    const { search, classId } = request.query;

    const where: any = {};
    if (classId && classId !== 'ALL' && String(classId).trim() !== '') {
      where.classId = String(classId).trim();
    }
    if (search && String(search).trim() !== '') {
      const term = String(search).trim();
      where.OR = [
        { user: { name: { contains: term } } },
        { rollNumber: { contains: term } }
      ];
    }

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, mobile: true, avatar: true, status: true, permissions: true } },
        class: true,
        section: true,
        fees: true,
        parentLinks: {
          include: {
            parent: { select: { id: true, name: true, email: true, mobile: true } }
          }
        }
      },
      orderBy: {
        admissionDate: 'desc'
      }
    });

    return reply.status(200).send({ data: students });
  } catch (error: any) {
    console.error('Get Admission History Error:', error);
    return reply.status(500).send({ message: error.message || 'Error retrieving admission history' });
  }
}
