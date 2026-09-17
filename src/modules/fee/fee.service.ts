import { prisma } from '../../prisma';
import { FeeStatus } from '@prisma/client';

export async function getAllFees(status?: FeeStatus, classId?: string, studentId?: string) {
  return prisma.fee.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(studentId ? { studentId } : {}),
      ...(classId ? { student: { classId } } : {}),
    },
    include: {
      student: {
        include: { user: true, class: true, section: true }
      },
      payments: true,
    },
    orderBy: { dueDate: 'asc' }
  });
}

export async function getFeeById(id: string) {
  return prisma.fee.findUnique({
    where: { id },
    include: {
      student: { include: { user: true, class: true, section: true } },
      payments: true,
    }
  });
}

export async function createFee(data: {
  studentId: string;
  title: string;
  totalAmount: number;
  dueDate: Date;
  paidDate?: Date;
  isPaid?: boolean;
  notify?: boolean;
}) {
  const isPaid = !!data.isPaid;
  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 86400000);
  const parsedPaidDate = isPaid ? (data.paidDate ? new Date(data.paidDate) : new Date()) : null;
  const fee = await prisma.fee.create({
    data: {
      studentId: data.studentId,
      title: data.title,
      totalAmount: data.totalAmount,
      dueDate: parsedDueDate,
      paidDate: parsedPaidDate,
      paidAmount: isPaid ? data.totalAmount : 0,
      status: isPaid ? 'PAID' : 'PENDING',
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          class: { select: { name: true } },
          parentLinks: { include: { parent: { select: { id: true } } } },
        },
      },
    },
  });

  // Automatically dispatch notification if unpaid and notify is not false
  if (!isPaid && data.notify !== false) {
    const notifications: any[] = [];
    const studentName = fee.student?.user?.name || 'Student';
    const className = fee.student?.class?.name || 'Batch';
    const dueDateStr = new Date(fee.dueDate).toLocaleDateString();

    for (const link of fee.student?.parentLinks || []) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: `Fee Due: ${fee.title}`,
          body: `Dear Parent, fee of ₹${fee.totalAmount} for ${studentName} (${className}) [${fee.title}] is due by ${dueDateStr}. Kindly submit by the due date. — Proefficient Institute`,
          type: 'FEE',
        });
      }
    }

    if (fee.student?.userId) {
      notifications.push({
        userId: fee.student.userId,
        title: `Fee Due: ${fee.title}`,
        body: `Your fee of ₹${fee.totalAmount} for ${fee.title} is due by ${dueDateStr}. Kindly submit on time.`,
        type: 'FEE',
      });
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  }

  return fee;
}

export async function markFeeStatus(feeId: string, isPaid: boolean, customPaidDate?: string) {
  const fee = await prisma.fee.findUniqueOrThrow({
    where: { id: feeId },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          parentLinks: { include: { parent: { select: { id: true } } } },
        },
      },
    },
  });

  const paidDate = isPaid
    ? (customPaidDate ? new Date(customPaidDate) : new Date())
    : null;

  const updatedFee = await prisma.fee.update({
    where: { id: feeId },
    data: {
      status: isPaid ? 'PAID' : 'PENDING',
      paidAmount: isPaid ? fee.totalAmount : 0,
      paidDate: paidDate,
    },
    include: {
      student: {
        include: {
          user: true,
          class: true,
          section: true,
        },
      },
    },
  });

  // If marked paid, create receipt notification for parents & student
  if (isPaid) {
    const studentName = fee.student?.user?.name || 'Student';
    const paidDateStr = paidDate ? paidDate.toLocaleDateString() : 'Today';
    const notifications: any[] = [];

    for (const link of fee.student?.parentLinks || []) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: `Fee Received: ${fee.title}`,
          body: `Dear Parent, fee payment of ₹${fee.totalAmount} for ${studentName} (${fee.title}) has been marked as PAID on ${paidDateStr}. — Proefficient Institute`,
          type: 'FEE',
        });
      }
    }

    if (fee.student?.userId) {
      notifications.push({
        userId: fee.student.userId,
        title: `Fee Received: ${fee.title}`,
        body: `Your fee payment of ₹${fee.totalAmount} for ${fee.title} is marked as PAID on ${paidDateStr}.`,
        type: 'FEE',
      });
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  }

  return updatedFee;
}

export async function sendFeeReminder(feeId: string, customDueDate?: string) {
  const fee = await prisma.fee.findUniqueOrThrow({
    where: { id: feeId },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          class: { select: { name: true } },
          parentLinks: { include: { parent: { select: { id: true } } } },
        },
      },
    },
  });

  let effectiveDueDate = fee.dueDate;
  if (customDueDate) {
    effectiveDueDate = new Date(customDueDate);
    await prisma.fee.update({
      where: { id: feeId },
      data: { dueDate: effectiveDueDate },
    });
  }

  const dueDateStr = effectiveDueDate.toLocaleDateString();
  const studentName = fee.student?.user?.name || 'Student';
  const className = fee.student?.class?.name || 'Batch';
  const notifications: any[] = [];

  for (const link of fee.student?.parentLinks || []) {
    if (link.parent?.id) {
      notifications.push({
        userId: link.parent.id,
        title: `Fee Due Reminder: ${fee.title}`,
        body: `Dear Parent, please note that the fee of ₹${fee.totalAmount} for ${studentName} (${className}) is due by ${dueDateStr}. Kindly submit the payment by the due date. — Proefficient Institute`,
        type: 'FEE',
      });
    }
  }

  if (fee.student?.userId) {
    notifications.push({
      userId: fee.student.userId,
      title: `Fee Due Reminder: ${fee.title}`,
      body: `Your fee of ₹${fee.totalAmount} for ${fee.title} is due by ${dueDateStr}. Kindly submit on time.`,
      type: 'FEE',
    });
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return { message: 'Reminder sent successfully', dueDate: effectiveDueDate, notifiedCount: notifications.length };
}

export async function sendBulkFeeReminders(classId: string, customDueDate?: string) {
  const pendingFees = await prisma.fee.findMany({
    where: {
      student: { classId },
      status: 'PENDING',
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          class: { select: { name: true } },
          parentLinks: { include: { parent: { select: { id: true } } } },
        },
      },
    },
  });

  if (pendingFees.length === 0) {
    return { message: 'No pending fees found for this class', count: 0 };
  }

  const newDueDate = customDueDate ? new Date(customDueDate) : undefined;
  if (newDueDate) {
    await prisma.fee.updateMany({
      where: {
        student: { classId },
        status: 'PENDING',
      },
      data: { dueDate: newDueDate },
    });
  }

  const notifications: any[] = [];

  for (const fee of pendingFees) {
    const effectiveDue = newDueDate || fee.dueDate;
    const dueDateStr = new Date(effectiveDue).toLocaleDateString();
    const studentName = fee.student?.user?.name || 'Student';
    const className = fee.student?.class?.name || 'Batch';

    for (const link of fee.student?.parentLinks || []) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: `Fee Due Reminder: ${fee.title}`,
          body: `Dear Parent, please note that the fee of ₹${fee.totalAmount} for ${studentName} (${className}) is due by ${dueDateStr}. Kindly submit the payment by the due date. — Proefficient Institute`,
          type: 'FEE',
        });
      }
    }

    if (fee.student?.userId) {
      notifications.push({
        userId: fee.student.userId,
        title: `Fee Due Reminder: ${fee.title}`,
        body: `Your fee of ₹${fee.totalAmount} for ${fee.title} is due by ${dueDateStr}. Kindly submit on time.`,
        type: 'FEE',
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return { message: `Reminders dispatched to ${pendingFees.length} students`, count: pendingFees.length, notifiedCount: notifications.length };
}

export async function deleteFee(id: string) {
  return prisma.fee.delete({ where: { id } });
}

export async function bulkCreateForClass(classId: string, title: string, totalAmount: number, dueDate: Date, sectionId?: string) {
  const students = await prisma.studentProfile.findMany({
    where: { classId, ...(sectionId ? { sectionId } : {}) },
    include: {
      user: { select: { id: true, name: true } },
      class: { select: { name: true } },
      parentLinks: { include: { parent: { select: { id: true } } } },
    }
  });

  const fees = students.map(student => ({
    studentId: student.id,
    title,
    totalAmount,
    dueDate,
    status: 'PENDING' as FeeStatus
  }));

  await prisma.fee.createMany({ data: fees });

  // Dispatch Fee Due Notifications to Parents and Students
  try {
    const notifications: any[] = [];
    const dueDateStr = new Date(dueDate).toLocaleDateString();

    for (const stu of students) {
      const studentName = stu.user?.name || 'Student';
      const className = stu.class?.name || 'Batch';

      // 1. Notify Linked Parents
      for (const link of stu.parentLinks) {
        if (link.parent?.id) {
          notifications.push({
            userId: link.parent.id,
            title: `💳 Fee Due: ${title}`,
            body: `Dear Parent, a fee structure of ₹${totalAmount} has been generated for ${studentName} (${className}). Due date: ${dueDateStr}.`,
            type: 'FEE',
          });
        }
      }

      // 2. Notify Student
      if (stu.userId) {
        notifications.push({
          userId: stu.userId,
          title: `💳 Fee Due: ${title}`,
          body: `A fee of ₹${totalAmount} has been scheduled for your batch. Due date: ${dueDateStr}.`,
          type: 'FEE',
        });
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (err) {
    console.error('Failed to dispatch fee creation notifications:', err);
  }

  return students.length;
}

export async function recordPayment(feeId: string, amount: number, mode: string, reference?: string) {
  return prisma.$transaction(async (tx) => {
    const fee = await tx.fee.findUniqueOrThrow({
      where: { id: feeId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            class: { select: { name: true } },
            parentLinks: { include: { parent: { select: { id: true } } } },
          }
        }
      }
    });
    const payment = await tx.feePayment.create({
      data: { feeId, amount, mode, reference }
    });

    const newPaidAmount = fee.paidAmount + amount;
    let newStatus: FeeStatus = fee.status;
    
    if (newPaidAmount >= fee.totalAmount) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    }

    const updatedFee = await tx.fee.update({
      where: { id: feeId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus
      }
    });

    // Create Payment Receipt Notification
    const notifications: any[] = [];
    const remaining = Math.max(0, fee.totalAmount - newPaidAmount);
    const studentName = fee.student?.user?.name || 'Student';

    // Parent Notification
    for (const link of fee.student?.parentLinks || []) {
      if (link.parent?.id) {
        notifications.push({
          userId: link.parent.id,
          title: `💳 Payment Receipt: ₹${amount} Received`,
          body: `Dear Parent, payment of ₹${amount} via ${mode} received for ${fee.title} (${studentName}). Balance: ₹${remaining}. Status: ${newStatus}.`,
          type: 'FEE',
        });
      }
    }

    // Student Notification
    if (fee.student?.userId) {
      notifications.push({
        userId: fee.student.userId,
        title: `💳 Payment Receipt: ₹${amount}`,
        body: `Payment of ₹${amount} via ${mode} logged for ${fee.title}. Remaining balance: ₹${remaining}.`,
        type: 'FEE',
      });
    }

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return { payment, updatedFee };
  });
}

export async function getStudentSummary(studentId: string) {
  const fees = await prisma.fee.findMany({ where: { studentId } });
  
  const totalFees = fees.reduce((sum, f) => sum + f.totalAmount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalPending = totalFees - totalPaid;
  const overdueCount = fees.filter(f => f.status === 'OVERDUE' || (f.status !== 'PAID' && f.dueDate < new Date())).length;
  
  return { totalFee: totalFees, totalFees, totalPaid, totalPending, overdueCount };
}

export async function updateFee(id: string, data: any) {
  return prisma.fee.update({
    where: { id },
    data
  });
}

export async function sendStudentFeeReminder(studentId: string, options?: {
  feeId?: string;
  customDueDate?: string;
  customMessage?: string;
  title?: string;
  amount?: number;
}) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, name: true, mobile: true, email: true } },
      class: { select: { name: true } },
      parentLinks: { include: { parent: { select: { id: true } } } },
      fees: {
        where: { status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!student) {
    throw new Error('Student profile not found');
  }

  const studentName = student.user?.name || 'Student';
  const className = student.class?.name || 'Batch';
  let feeTitle = options?.title;
  let feeAmount = options?.amount;
  let dueDateStr = options?.customDueDate ? new Date(options.customDueDate).toLocaleDateString() : '';

  if (options?.feeId) {
    const fee = student.fees.find((f) => f.id === options.feeId);
    if (fee) {
      feeTitle = feeTitle || fee.title;
      feeAmount = feeAmount !== undefined ? feeAmount : fee.totalAmount;
      if (options.customDueDate) {
        await prisma.fee.update({
          where: { id: fee.id },
          data: { dueDate: new Date(options.customDueDate) },
        });
        dueDateStr = new Date(options.customDueDate).toLocaleDateString();
      } else {
        dueDateStr = new Date(fee.dueDate).toLocaleDateString();
      }
    }
  } else if (!feeTitle && student.fees.length > 0) {
    const firstFee = student.fees[0];
    feeTitle = firstFee.title;
    feeAmount = student.fees.reduce((acc, f) => acc + (f.totalAmount || 0), 0);
    dueDateStr = new Date(firstFee.dueDate).toLocaleDateString();
  }

  feeTitle = feeTitle || 'Course Tuition Fee';
  feeAmount = feeAmount !== undefined ? feeAmount : 0;
  if (!dueDateStr) {
    dueDateStr = new Date(Date.now() + 7 * 86400000).toLocaleDateString();
  }

  const defaultParentBody = `Dear Parent, please note that the fee ${feeAmount > 0 ? `of ₹${feeAmount}` : ''} for ${studentName} (${className}) [${feeTitle}] is due by ${dueDateStr}. ${options?.customMessage ? `Note: ${options.customMessage}. ` : ''}Kindly submit the payment at your earliest convenience. — Proefficient Institute`;
  const defaultStudentBody = `Your fee ${feeAmount > 0 ? `of ₹${feeAmount}` : ''} for ${feeTitle} is due by ${dueDateStr}. ${options?.customMessage ? `Note: ${options.customMessage}. ` : ''}Kindly submit on time.`;

  const notifications: any[] = [];

  for (const link of student.parentLinks || []) {
    if (link.parent?.id) {
      notifications.push({
        userId: link.parent.id,
        title: `Fee Due: ${studentName}`,
        body: defaultParentBody,
        type: 'FEE',
      });
    }
  }

  if (student.userId) {
    notifications.push({
      userId: student.userId,
      title: `Fee Due: ${feeTitle}`,
      body: defaultStudentBody,
      type: 'FEE',
    });
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return {
    success: true,
    message: `Fee notification sent to ${studentName} and parent(s).`,
    notifiedCount: notifications.length,
    studentName,
    dueDate: dueDateStr,
  };
}
