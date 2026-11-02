import { prisma } from '../../prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { saveBase64Image } from '../../utils/file-saver';

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

  // 1. Try parsing DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD explicitly first!
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

  // 2. Fallback to standard ISO or standard new Date()
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

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

    // Helper to extract clean 10-digit mobile phone
    const get10Digits = (val: any): string => {
      if (!val || typeof val !== 'string') return '';
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    const cleanParentEmail = parentEmail && typeof parentEmail === 'string' && parentEmail.trim() ? parentEmail.trim().toLowerCase() : null;

    const cleanMobile = mobile && typeof mobile === 'string' && mobile.trim() ? mobile.trim() : null;
    const student10 = get10Digits(cleanMobile);

    const cleanFatherPhone = fatherPhone && typeof fatherPhone === 'string' && fatherPhone.trim() ? fatherPhone.trim() : null;
    const cleanMotherPhone = motherPhone && typeof motherPhone === 'string' && motherPhone.trim() ? motherPhone.trim() : null;
    const father10 = get10Digits(cleanFatherPhone);
    const mother10 = get10Digits(cleanMotherPhone);
    const hasSeparateParents = Boolean(father10 && mother10 && father10 !== mother10);

    const pName = parentName || fatherName || motherName || null;
    const rawPMobile = parentMobile || fatherPhone || motherPhone || cleanMobile || null;
    const cleanPMobile = rawPMobile && typeof rawPMobile === 'string' && rawPMobile.trim() ? rawPMobile.trim() : null;
    const parent10 = get10Digits(cleanPMobile);

    // Determine if student and parent share a family mobile number
    let isSharedFamilyMobile = !cleanMobile || !cleanPMobile || 
      (student10 && parent10 && student10 === parent10) || 
      cleanMobile === cleanPMobile ||
      (student10 && father10 && student10 === father10) ||
      (student10 && mother10 && student10 === mother10);

    let studentMobileToSave = cleanMobile;
    let autoDetectedParentId = existingParentId || null;

    // Check if this mobile is already in use by ANY user in the system (sibling, parent, etc.)
    // In households with 2 phones and 3+ students, or where students share parent's phone,
    // we NEVER reject enrollment! We treat it as a shared household/family contact.
    if (student10 || cleanMobile) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(cleanMobile ? [{ mobile: cleanMobile }] : []),
            ...(student10 ? [{ mobile: { endsWith: student10 } }] : [])
          ]
        },
        include: {
          studentProfile: {
            include: {
              parentLinks: { include: { parent: true } }
            }
          },
          parentLinks: {
            include: { parent: true }
          }
        }
      });

      if (existingUser) {
        // Shared household / sibling phone detected!
        // Another family member in the house already uses this phone number.
        // Student will log in seamlessly with their unique Roll Number!
        isSharedFamilyMobile = true;
        studentMobileToSave = null;

        if (existingUser.role === 'parent') {
          // Phone belongs to an existing parent: auto-link this student to the parent!
          if (!autoDetectedParentId) {
            autoDetectedParentId = existingUser.id;
          }
        } else if (existingUser.role === 'student') {
          // Phone was used by an enrolled sibling: link to that sibling's parent account!
          const siblingParent = existingUser.studentProfile?.parentLinks?.[0]?.parent;
          if (siblingParent && !autoDetectedParentId) {
            autoDetectedParentId = siblingParent.id;
          }
        }
      }
    }

    if (isSharedFamilyMobile) {
      // Family shared mobile: Student logs in with Roll Number, Parent gets the mobile login
      studentMobileToSave = null;
    }

    // Email deduplication to prevent unique constraint crashes
    let safeStudentEmail = cleanEmail;
    if (safeStudentEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: safeStudentEmail } });
      if (existingEmail) {
        safeStudentEmail = null; // Prevent unique crash on duplicate student email
      }
    }

    let safeParentEmail = cleanParentEmail;
    if (safeParentEmail) {
      if (safeParentEmail === safeStudentEmail) {
        safeStudentEmail = null;
      }
      const existingPEmail = await prisma.user.findUnique({ where: { email: safeParentEmail } });
      if (existingPEmail) {
        safeParentEmail = null;
      }
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

    // Generate Guaranteed-Unique Roll Number
    const classData = await prisma.class.findUnique({ where: { id: classId } });
    const std = classData?.standard || 10;
    const year = new Date().getFullYear();
    const existingCount = await prisma.studentProfile.count({ where: { classId } });
    let candidateSeq = existingCount + 1;
    const stdStr = String(std).padStart(2, '0');

    let assignedRollNumber = rollNumber && rollNumber.trim() ? rollNumber.trim() : '';
    if (!assignedRollNumber) {
      let candidate = `ST${stdStr}${year}${String(candidateSeq).padStart(2, '0')}`;
      while (await prisma.studentProfile.findFirst({ where: { rollNumber: candidate } })) {
        candidateSeq++;
        candidate = `ST${stdStr}${year}${String(candidateSeq).padStart(2, '0')}`;
      }
      assignedRollNumber = candidate;
    }

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

    const savedAvatarUrl = saveBase64Image(avatar, 'avatars');
    if (savedAvatarUrl) {
      (admissionForm as any).studentPhoto = savedAvatarUrl;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Student User with complete admission details
      const studentUser = await tx.user.create({
        data: {
          name,
          email: safeStudentEmail,
          mobile: studentMobileToSave,
          password: studentHashedPass,
          role: 'student',
          avatar: savedAvatarUrl || null,
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

      // 4. Handle Parent(s) - Check if Mother and Father have different mobile numbers!
      let parentUserId = autoDetectedParentId || existingParentId;
      let finalParentPass = '';
      let parentLink = null;
      let parentChildCount = 0;

      let fatherAccountData: any = null;
      let motherAccountData: any = null;

      if (hasSeparateParents && !parentUserId) {
        // Dual Parent Mode: Father and Mother have different mobile numbers -> Create separate accounts for both!
        
        // --- 4A. FATHER ACCOUNT ---
        let fatherUserId: string | null = null;
        let fatherPass = '';
        let isFatherExisting = false;

        const existingFather = (cleanFatherPhone || father10) ? await tx.user.findFirst({
          where: {
            role: 'parent',
            OR: [
              ...(cleanFatherPhone ? [{ mobile: cleanFatherPhone }] : []),
              ...(father10 ? [{ mobile: { endsWith: father10 } }] : [])
            ]
          }
        }) : null;

        if (existingFather) {
          fatherUserId = existingFather.id;
          fatherPass = '(existing account)';
          isFatherExisting = true;
        } else {
          let safeFatherMobile: string | null = cleanFatherPhone;
          if (cleanFatherPhone) {
            const conflict = await tx.user.findFirst({
              where: {
                OR: [
                  { mobile: cleanFatherPhone },
                  ...(father10 ? [{ mobile: { endsWith: father10 } }] : [])
                ]
              }
            });
            if (conflict) safeFatherMobile = null;
          }

          fatherPass = parentPassword && parentPassword.trim() ? parentPassword.trim() : generateRandomPassword('PAR');
          const fatherHashed = await bcrypt.hash(fatherPass, 10);
          const newFather = await tx.user.create({
            data: {
              name: fatherName?.trim() || `Father of ${name}`,
              email: safeParentEmail,
              mobile: safeFatherMobile,
              password: fatherHashed,
              role: 'parent'
            }
          });
          fatherUserId = newFather.id;
        }

        if (fatherUserId) {
          parentLink = await tx.parentStudent.create({
            data: {
              parentId: fatherUserId,
              studentId: studentProfile.id,
              relation: 'Father'
            },
            include: { parent: true }
          });

          parentChildCount = await tx.parentStudent.count({ where: { parentId: fatherUserId } });

          await tx.notification.create({
            data: {
              userId: fatherUserId,
              title: parentChildCount > 1 ? 'New Child Enrolled!' : 'Welcome to Proficient Institute of Learning!',
              body: `Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. Admission form verified.`,
              type: 'SYSTEM'
            }
          });

          fatherAccountData = {
            name: fatherName?.trim() || 'Father',
            login: cleanFatherPhone,
            password: fatherPass,
            isExisting: isFatherExisting
          };
          parentUserId = fatherUserId;
          finalParentPass = fatherPass;
        }

        // --- 4B. MOTHER ACCOUNT ---
        let motherUserId: string | null = null;
        let motherPass = '';
        let isMotherExisting = false;

        const existingMother = (cleanMotherPhone || mother10) ? await tx.user.findFirst({
          where: {
            role: 'parent',
            OR: [
              ...(cleanMotherPhone ? [{ mobile: cleanMotherPhone }] : []),
              ...(mother10 ? [{ mobile: { endsWith: mother10 } }] : [])
            ]
          }
        }) : null;

        if (existingMother) {
          motherUserId = existingMother.id;
          motherPass = '(existing account)';
          isMotherExisting = true;
        } else {
          let safeMotherMobile: string | null = cleanMotherPhone;
          if (cleanMotherPhone) {
            const conflict = await tx.user.findFirst({
              where: {
                OR: [
                  { mobile: cleanMotherPhone },
                  ...(mother10 ? [{ mobile: { endsWith: mother10 } }] : [])
                ]
              }
            });
            if (conflict) safeMotherMobile = null;
          }

          motherPass = generateRandomPassword('PAR');
          const motherHashed = await bcrypt.hash(motherPass, 10);
          const newMother = await tx.user.create({
            data: {
              name: motherName?.trim() || `Mother of ${name}`,
              email: null,
              mobile: safeMotherMobile,
              password: motherHashed,
              role: 'parent'
            }
          });
          motherUserId = newMother.id;
        }

        if (motherUserId) {
          await tx.parentStudent.create({
            data: {
              parentId: motherUserId,
              studentId: studentProfile.id,
              relation: 'Mother'
            }
          });

          const mChildCount = await tx.parentStudent.count({ where: { parentId: motherUserId } });

          await tx.notification.create({
            data: {
              userId: motherUserId,
              title: mChildCount > 1 ? 'New Child Enrolled!' : 'Welcome to Proficient Institute of Learning!',
              body: `Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. Admission form verified.`,
              type: 'SYSTEM'
            }
          });

          motherAccountData = {
            name: motherName?.trim() || 'Mother',
            login: cleanMotherPhone,
            password: motherPass,
            isExisting: isMotherExisting
          };
        }
      } else if (!parentUserId && (pName || cleanPMobile)) {
        // Check if a parent with this mobile or 10-digit number already exists
        const existingParent = (cleanPMobile || parent10) ? await tx.user.findFirst({
          where: {
            role: 'parent',
            OR: [
              ...(cleanPMobile ? [{ mobile: cleanPMobile }] : []),
              ...(parent10 ? [{ mobile: { endsWith: parent10 } }] : [])
            ]
          }
        }) : null;

        if (existingParent) {
          // Reuse existing parent account instead of creating duplicate
          parentUserId = existingParent.id;
          finalParentPass = '(existing account)';
        } else {
          // Check if any non-parent user uses this mobile
          let safeParentMobile = cleanPMobile;
          if (cleanPMobile) {
            const conflictUser = await tx.user.findFirst({
              where: {
                OR: [
                  { mobile: cleanPMobile },
                  ...(parent10 ? [{ mobile: { endsWith: parent10 } }] : [])
                ]
              }
            });
            if (conflictUser) {
              safeParentMobile = null;
            }
          }

          finalParentPass = parentPassword && parentPassword.trim() ? parentPassword.trim() : generateRandomPassword('PAR');
          const parentHashedPass = await bcrypt.hash(finalParentPass, 10);
          
          const parentUser = await tx.user.create({
            data: {
              name: pName || `Parent of ${name}`,
              email: safeParentEmail,
              mobile: safeParentMobile,
              password: parentHashedPass,
              role: 'parent',
            }
          });
          parentUserId = parentUser.id;
        }

        if (parentUserId) {
          parentLink = await tx.parentStudent.create({
            data: {
              parentId: parentUserId,
              studentId: studentProfile.id,
              relation: parentRelation || (fatherName?.trim() ? 'Father' : 'Mother')
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
            ? `Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. You now have ${parentChildCount} children enrolled at Proficient Institute of Learning.`
            : `Welcome! Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. Admission form verified.`;

          await tx.notification.create({
            data: {
              userId: parentUserId,
              title: parentChildCount > 1 ? 'New Child Enrolled!' : 'Welcome to Proficient Institute of Learning!',
              body: notifBody,
              type: 'SYSTEM'
            }
          });
        }
      } else if (parentUserId) {
        // Link sibling to existing parent
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

        parentChildCount = await tx.parentStudent.count({
          where: { parentId: parentUserId }
        });

        await tx.notification.create({
          data: {
            userId: parentUserId,
            title: 'New Child Enrolled!',
            body: `Your ward ${studentUser.name} has been enrolled in ${studentProfile.class.name}. You now have ${parentChildCount} children enrolled at Proficient Institute of Learning.`,
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

      // Prepare complete credentials
      const admissionCredentials = {
        studentLogin: assignedRollNumber,
        studentPassword: studentPass,
        studentMobile: studentMobileToSave || cleanMobile || null,
        parentLogin: parentLink ? (parentLink.parent?.mobile || cleanPMobile) : cleanPMobile,
        parentPassword: finalParentPass || (existingParentId ? 'Existing Account' : null),
        parentChildCount: parentChildCount,
        isExistingParent: finalParentPass === '(existing account)' || !!existingParentId || !!autoDetectedParentId,
        hasSeparateParentAccounts: Boolean(fatherAccountData && motherAccountData),
        fatherAccount: fatherAccountData ? {
          name: fatherAccountData.name,
          login: fatherAccountData.login,
          password: fatherAccountData.password,
          isExisting: fatherAccountData.isExisting
        } : null,
        motherAccount: motherAccountData ? {
          name: motherAccountData.name,
          login: motherAccountData.login,
          password: motherAccountData.password,
          isExisting: motherAccountData.isExisting
        } : null,
        isSharedFamilyMobile: Boolean(isSharedFamilyMobile || !cleanMobile)
      };

      // Permanently persist credentials in user permissions so admin can re-download & distribute anytime
      const updatedPermissions = {
        admissionForm: {
          ...admissionForm,
          credentials: admissionCredentials
        },
        admissionCredentials
      };

      await tx.user.update({
        where: { id: studentUser.id },
        data: {
          permissions: updatedPermissions
        }
      });

      studentUser.permissions = updatedPermissions as any;

      return {
        studentProfile,
        studentUser,
        parentLink,
        credentials: admissionCredentials
      };
    });

    return reply.status(201).send({
      message: 'Student enrolled successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Enrollment Error:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
      if (targetStr.includes('email')) {
        return reply.status(400).send({ message: 'A user with this email address already exists. Please leave email blank or use a different one.' });
      }
      if (targetStr.includes('mobile')) {
        return reply.status(400).send({ message: 'A user with this mobile number already exists in the system.' });
      }
      if (targetStr.includes('rollNumber')) {
        return reply.status(400).send({ message: 'A student with this roll number already exists. Please leave roll number empty to auto-generate.' });
      }
      return reply.status(400).send({ message: 'Enrollment failed: A duplicate record already exists in database.' });
    }
    return reply.status(400).send({ message: error.message || 'Error enrolling student' });
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
        class: { select: { id: true, name: true, standard: true } },
        section: { select: { id: true, name: true } },
        fees: { select: { id: true, totalAmount: true, paidAmount: true, status: true, dueDate: true } },
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

    const enrichedStudents = students.map((s: any) => {
      try {
        let rawPerms: any = s.user?.permissions;
        if (typeof rawPerms === 'string') {
          try { rawPerms = JSON.parse(rawPerms); } catch (_) { rawPerms = {}; }
        }
        const adm = { ...(rawPerms?.admissionForm || {}) };
        // Strip heavy raw base64 data from history payload to ensure fast transfer
        delete adm.studentPhoto;
        delete adm.documentBase64;

        // Auto-migrate legacy base64 avatars to static disk files
        let userAvatar = s.user?.avatar;
        if (userAvatar && userAvatar.startsWith('data:image')) {
          const fileUrl = saveBase64Image(userAvatar, 'avatars');
          if (fileUrl && fileUrl !== userAvatar) {
            userAvatar = fileUrl;
            prisma.user.update({ where: { id: s.user.id }, data: { avatar: fileUrl } }).catch(() => {});
          }
        }
        const savedCreds = rawPerms?.admissionCredentials || rawPerms?.credentials || adm?.credentials || null;

        const fatherLink = s.parentLinks?.find((p: any) => p.relation?.toLowerCase() === 'father');
        const motherLink = s.parentLinks?.find((p: any) => p.relation?.toLowerCase() === 'mother');
        const primaryParent = fatherLink?.parent || s.parentLinks?.[0]?.parent || motherLink?.parent || null;

        const fPhone = adm.fatherPhone || fatherLink?.parent?.mobile || null;
        const mPhone = adm.motherPhone || motherLink?.parent?.mobile || null;
        const hasSeparate = savedCreds?.hasSeparateParentAccounts ?? Boolean((fatherLink && motherLink && fatherLink.parentId !== motherLink.parentId) || (fPhone && mPhone && fPhone !== mPhone));

        const credentials = {
          studentLogin: savedCreds?.studentLogin || s.rollNumber || s.user?.mobile || 'STU',
          studentPassword: savedCreds?.studentPassword || null,
          parentLogin: savedCreds?.parentLogin || primaryParent?.mobile || fPhone || mPhone || 'N/A',
          parentPassword: savedCreds?.parentPassword || (savedCreds?.isExistingParent ? 'Existing Account' : null),
          hasSeparateParentAccounts: hasSeparate,
          fatherAccount: savedCreds?.fatherAccount || (fPhone ? {
            name: fatherLink?.parent?.name || adm.fatherName || 'Father',
            login: fPhone,
            password: savedCreds?.fatherAccount?.password || null,
            isExisting: Boolean(savedCreds?.fatherAccount?.isExisting)
          } : null),
          motherAccount: savedCreds?.motherAccount || (mPhone ? {
            name: motherLink?.parent?.name || adm.motherName || 'Mother',
            login: mPhone,
            password: savedCreds?.motherAccount?.password || null,
            isExisting: Boolean(savedCreds?.motherAccount?.isExisting)
          } : null),
          isExistingParent: savedCreds?.isExistingParent ?? false,
          isSharedFamilyMobile: savedCreds?.isSharedFamilyMobile ?? !s.user?.mobile,
        };

        return {
          ...s,
          user: s.user ? { ...s.user, avatar: userAvatar } : s.user,
          credentials
        };
      } catch (err) {
        return s;
      }
    });

    return reply.status(200).send({ data: enrichedStudents });
  } catch (error: any) {
    console.error('Get Admission History Error:', error);
    return reply.status(500).send({ message: error.message || 'Error retrieving admission history' });
  }
}

export async function updateStudentAdmission(request: any, reply: any) {
  try {
    const studentId = request.params.id;
    const {
      name, email, mobile, avatar, rollNumber,
      classId, sectionId, gender, dob, address, admissionDate,
      // Official Admission Form Fields
      fatherName, fatherOccupation, fatherQualification, fatherPhone,
      motherName, motherOccupation, motherQualification, motherPhone,
      schoolName, board, previousPercentage,
      medicalIssue, bloodGroup, referenceDetails,
      appliedClass, dateOfJoining,
      totalFee, finalFeeAfterScholarship, installments
    } = request.body;

    // Support lookup by studentProfile.id OR studentProfile.userId
    let studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parentLinks: { include: { parent: true } }
      }
    });

    if (!studentProfile) {
      studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: studentId },
        include: {
          user: true,
          parentLinks: { include: { parent: true } }
        }
      });
    }

    if (!studentProfile) {
      return reply.status(404).send({ message: 'Student record not found.' });
    }

    // Preserve existing admissionForm and locked fields
    let existingPerms: any = studentProfile.user.permissions;
    if (typeof existingPerms === 'string') {
      try { existingPerms = JSON.parse(existingPerms); } catch (_) { existingPerms = {}; }
    }
    if (!existingPerms || typeof existingPerms !== 'object') {
      existingPerms = {};
    }
    const oldForm = existingPerms.admissionForm || {};
    const existingCreds = existingPerms.admissionCredentials || oldForm.credentials;

    // Get class info if classId changed or provided
    let finalAppliedClass = appliedClass !== undefined ? appliedClass : oldForm.appliedClass;
    if (classId && (!finalAppliedClass || classId !== studentProfile.classId)) {
      const cls = await prisma.class.findUnique({ where: { id: classId } });
      if (cls) {
        finalAppliedClass = cls.name;
      }
    }

    // Build updated admissionForm
    const updatedAdmissionForm = {
      ...oldForm,
      ...(existingCreds ? { credentials: existingCreds } : {}),
      fatherName: fatherName !== undefined ? (fatherName?.trim() || null) : oldForm.fatherName,
      fatherOccupation: fatherOccupation !== undefined ? (fatherOccupation?.trim() || null) : oldForm.fatherOccupation,
      fatherQualification: fatherQualification !== undefined ? (fatherQualification?.trim() || null) : oldForm.fatherQualification,
      fatherPhone: fatherPhone !== undefined ? (fatherPhone?.trim() || null) : oldForm.fatherPhone,

      motherName: motherName !== undefined ? (motherName?.trim() || null) : oldForm.motherName,
      motherOccupation: motherOccupation !== undefined ? (motherOccupation?.trim() || null) : oldForm.motherOccupation,
      motherQualification: motherQualification !== undefined ? (motherQualification?.trim() || null) : oldForm.motherQualification,
      motherPhone: motherPhone !== undefined ? (motherPhone?.trim() || null) : oldForm.motherPhone,

      schoolName: schoolName !== undefined ? (schoolName?.trim() || null) : oldForm.schoolName,
      board: board !== undefined ? (board?.trim() || null) : oldForm.board,
      previousPercentage: previousPercentage !== undefined ? (previousPercentage?.trim() || null) : oldForm.previousPercentage,
      medicalIssue: medicalIssue !== undefined ? (medicalIssue?.trim() || '--') : oldForm.medicalIssue,
      bloodGroup: bloodGroup !== undefined ? (bloodGroup?.trim() || '--') : oldForm.bloodGroup,
      referenceDetails: referenceDetails !== undefined ? (referenceDetails?.trim() || 'Social Media') : oldForm.referenceDetails,
      appliedClass: finalAppliedClass,
      dateOfJoining: dateOfJoining !== undefined ? dateOfJoining : oldForm.dateOfJoining,
      totalFee: totalFee !== undefined ? (totalFee != null ? Number(totalFee) : null) : oldForm.totalFee,
      finalFeeAfterScholarship: finalFeeAfterScholarship !== undefined ? (finalFeeAfterScholarship != null ? Number(finalFeeAfterScholarship) : null) : oldForm.finalFeeAfterScholarship,
      installments: Array.isArray(installments) ? installments : oldForm.installments
    };

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Student User (name, email, mobile, avatar, permissions)
      const userUpdateData: any = {
        permissions: { 
          ...existingPerms, 
          admissionForm: updatedAdmissionForm,
          ...(existingCreds ? { admissionCredentials: existingCreds } : {})
        }
      };
      if (name && name.trim()) userUpdateData.name = name.trim().toUpperCase();
      if (email !== undefined) {
        userUpdateData.email = email && email.trim() ? email.trim().toLowerCase() : null;
      }
      if (avatar !== undefined) userUpdateData.avatar = saveBase64Image(avatar, 'avatars');

      if (mobile !== undefined && mobile !== null) {
        const cleanMob = String(mobile).trim();
        if (cleanMob && cleanMob !== studentProfile.user.mobile) {
          const conflict = await tx.user.findFirst({
            where: { mobile: cleanMob, id: { not: studentProfile.userId } }
          });
          if (conflict) {
            throw new Error(`Mobile number ${cleanMob} is already registered with another account.`);
          }
          userUpdateData.mobile = cleanMob;
        } else if (!cleanMob) {
          userUpdateData.mobile = null;
        }
      }

      await tx.user.update({
        where: { id: studentProfile.userId },
        data: userUpdateData
      });

      // 2. Update Student Profile (Class Upgrade, Section, and Roll Number)
      const profileUpdateData: any = {};

      if (classId) {
        profileUpdateData.classId = classId;
        // Verify section belongs to the selected/upgraded class, or assign/create default section
        let validSection = null;
        if (sectionId) {
          validSection = await tx.section.findFirst({ where: { id: sectionId, classId } });
        }
        if (validSection) {
          profileUpdateData.sectionId = validSection.id;
        } else {
          // Check if current student's section already belongs to this class
          const currSection = await tx.section.findFirst({ where: { id: studentProfile.sectionId, classId } });
          if (currSection) {
            profileUpdateData.sectionId = currSection.id;
          } else {
            // Find default section for this class or create Section A
            const defaultSection = await tx.section.findFirst({ where: { classId } });
            if (defaultSection) {
              profileUpdateData.sectionId = defaultSection.id;
            } else {
              const newSec = await tx.section.create({ data: { classId, name: 'A' } });
              profileUpdateData.sectionId = newSec.id;
            }
          }
        }
      } else if (sectionId) {
        profileUpdateData.sectionId = sectionId;
      }

      if (rollNumber && rollNumber.trim() && rollNumber.trim() !== studentProfile.rollNumber) {
        const cleanRoll = rollNumber.trim().toUpperCase();
        const existingWithRoll = await tx.studentProfile.findFirst({
          where: { rollNumber: cleanRoll, id: { not: studentProfile.id } }
        });
        if (existingWithRoll) {
          throw new Error(`Roll number "${cleanRoll}" is already assigned to another student.`);
        }
        profileUpdateData.rollNumber = cleanRoll;
      }

      if (gender !== undefined) profileUpdateData.gender = gender;
      if (dob !== undefined) profileUpdateData.dob = parseFlexibleDate(dob);
      if (address !== undefined) profileUpdateData.address = address?.trim() || null;
      if (admissionDate !== undefined) profileUpdateData.admissionDate = parseFlexibleDate(admissionDate) || new Date();

      const updatedProfile = await tx.studentProfile.update({
        where: { id: studentProfile.id },
        data: profileUpdateData,
        include: {
          user: true,
          class: true,
          section: true,
          parentLinks: {
            include: {
              parent: true
            }
          }
        }
      });

      // 3. Update Parent Names / Phones if Father / Mother details changed
      if (fatherName && fatherName.trim()) {
        const fatherLink = studentProfile.parentLinks?.find(l => l.relation === 'Father');
        if (fatherLink) {
          const parentUpdate: any = { name: fatherName.trim() };
          if (fatherPhone && fatherPhone.trim()) {
            const cleanPhone = fatherPhone.trim();
            const conflict = await tx.user.findFirst({
              where: { mobile: cleanPhone, id: { not: fatherLink.parentId } }
            });
            if (!conflict) parentUpdate.mobile = cleanPhone;
          }
          await tx.user.update({
            where: { id: fatherLink.parentId },
            data: parentUpdate
          });
        }
      }
      if (motherName && motherName.trim()) {
        const motherLink = studentProfile.parentLinks?.find(l => l.relation === 'Mother');
        if (motherLink) {
          const parentUpdate: any = { name: motherName.trim() };
          if (motherPhone && motherPhone.trim()) {
            const cleanPhone = motherPhone.trim();
            const conflict = await tx.user.findFirst({
              where: { mobile: cleanPhone, id: { not: motherLink.parentId } }
            });
            if (!conflict) parentUpdate.mobile = cleanPhone;
          }
          await tx.user.update({
            where: { id: motherLink.parentId },
            data: parentUpdate
          });
        }
      }

      // 4. Update installments in fees if provided
      if (Array.isArray(installments) && installments.length > 0) {
        const existingFees = await tx.fee.findMany({
          where: {
            studentId: studentProfile.id,
            title: { startsWith: 'Admission Installment' }
          },
          orderBy: { createdAt: 'asc' }
        });

        for (let idx = 0; idx < installments.length; idx++) {
          const inst = installments[idx];
          const instNo = inst.no || idx + 1;
          const instAmt = Number(inst.amount || 0);
          if (instAmt <= 0) continue;

          const existingFee = existingFees[idx];
          if (existingFee) {
            await tx.fee.update({
              where: { id: existingFee.id },
              data: {
                totalAmount: instAmt,
                paidAmount: inst.status === 'Paid' ? instAmt : existingFee.paidAmount,
                dueDate: parseFlexibleDate(inst.dateSlot) || existingFee.dueDate,
                status: inst.status === 'Paid' ? 'PAID' : (existingFee.status || 'PENDING'),
              }
            });
          } else {
            await tx.fee.create({
              data: {
                studentId: studentProfile.id,
                title: `Admission Installment ${instNo}`,
                totalAmount: instAmt,
                paidAmount: inst.status === 'Paid' ? instAmt : 0,
                dueDate: parseFlexibleDate(inst.dateSlot) || new Date(),
                status: inst.status === 'Paid' ? 'PAID' : 'PENDING',
              }
            });
          }
        }
      }

      return updatedProfile;
    });

    return reply.status(200).send({
      message: 'Student admission details updated successfully',
      data: updated
    });
  } catch (error: any) {
    console.error('Update Admission Error:', error);
    return reply.status(400).send({ message: error.message || 'Error updating student admission details' });
  }
}
