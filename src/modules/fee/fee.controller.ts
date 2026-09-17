import * as feeService from './fee.service';

export async function getAll(request: any, reply: any) {
  try {
    const { status, classId, studentId } = request.query;
    const data = await feeService.getAllFees(status, classId, studentId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const data = await feeService.getFeeById(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Fee not found' });
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function create(request: any, reply: any) {
  try {
    const { studentId, title, totalAmount, dueDate, isPaid, paidDate, notify } = request.body;
    if (!studentId || !title || totalAmount === undefined || !dueDate) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    const data = await feeService.createFee({
      studentId,
      title,
      totalAmount: Number(totalAmount),
      dueDate: new Date(dueDate),
      isPaid,
      paidDate: paidDate ? new Date(paidDate) : undefined,
      notify,
    });
    reply.status(201).send(data);
  } catch (error: any) {
    reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function bulkCreateForClass(request: any, reply: any) {
  try {
    const { classId, sectionId, title, totalAmount, dueDate } = request.body;
    if (!classId || !title || totalAmount === undefined || !dueDate) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    const count = await feeService.bulkCreateForClass(classId, title, totalAmount, new Date(dueDate), sectionId);
    reply.status(201).send({ message: `Created ${count} fee records` });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function recordPayment(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { amount, mode, reference } = request.body;
    if (amount === undefined || !mode) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    const data = await feeService.recordPayment(id, amount, mode, reference);
    reply.status(201).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getStudentSummary(request: any, reply: any) {
  try {
    const data = await feeService.getStudentSummary(request.params.studentId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function update(request: any, reply: any) {
  try {
    const data = await feeService.updateFee(request.params.id, request.body);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function deleteFee(request: any, reply: any) {
  try {
    await feeService.deleteFee(request.params.id);
    reply.status(200).send({ message: 'Deleted successfully' });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function markStatus(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { isPaid, paidDate } = request.body || {};
    const data = await feeService.markFeeStatus(id, !!isPaid, paidDate);
    reply.status(200).send(data);
  } catch (error: any) {
    reply.status(400).send({ error: error.message || 'Failed to update fee status' });
  }
}

export async function sendReminder(request: any, reply: any) {
  try {
    const { id } = request.params;
    const { dueDate } = request.body || {};
    const result = await feeService.sendFeeReminder(id, dueDate);
    reply.status(200).send(result);
  } catch (error: any) {
    reply.status(400).send({ error: error.message || 'Failed to send fee reminder' });
  }
}

export async function sendBulkReminders(request: any, reply: any) {
  try {
    const { classId, dueDate } = request.body || {};
    if (!classId) {
      return reply.status(400).send({ error: 'classId is required' });
    }
    const result = await feeService.sendBulkFeeReminders(classId, dueDate);
    reply.status(200).send(result);
  } catch (error: any) {
    reply.status(400).send({ error: error.message || 'Failed to send bulk fee reminders' });
  }
}

export async function sendStudentReminder(request: any, reply: any) {
  try {
    const { studentId, feeId, dueDate, message, title, amount } = request.body || {};
    if (!studentId) {
      return reply.status(400).send({ error: 'studentId is required' });
    }
    const result = await feeService.sendStudentFeeReminder(studentId, {
      feeId,
      customDueDate: dueDate,
      customMessage: message,
      title,
      amount: amount !== undefined ? Number(amount) : undefined,
    });
    reply.status(200).send(result);
  } catch (error: any) {
    reply.status(400).send({ error: error.message || 'Failed to send student fee reminder' });
  }
}
