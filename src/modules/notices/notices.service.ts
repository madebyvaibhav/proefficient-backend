import { prisma } from '../../prisma';

export class NoticeService {
  async createNotice(data: any) {
    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        visibility: data.visibility || 'all',
        targetClassId: data.targetClassId || null,
        targetSectionId: data.targetSectionId || null,
        senderId: data.senderId || data.authorId || 'admin',
        senderRole: data.senderRole || 'admin',
        imageUri: data.imageUri || null,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    // Automatically dispatch notifications to relevant users
    try {
      const vis = (data.visibility || 'all').toLowerCase();
      const whereClause: any = { status: 'ACTIVE' };

      if (vis === 'parents' || vis === 'parent') {
        whereClause.role = 'parent';
      } else if (vis === 'students' || vis === 'student') {
        whereClause.role = 'student';
      } else if (vis === 'teachers' || vis === 'teacher') {
        whereClause.role = 'teacher';
      } else {
        // all
        whereClause.role = { in: ['parent', 'student', 'teacher'] };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      });

      const notifs = users.map(u => ({
        userId: u.id,
        title: `📢 Notice: ${data.title}`,
        body: data.content?.slice(0, 180) || data.title,
        type: 'NOTICE',
      }));

      if (notifs.length > 0) {
        await prisma.notification.createMany({ data: notifs });
      }
    } catch (err) {
      console.error('Failed to dispatch notice notifications:', err);
    }

    return notice;
  }

  async getNotices(role?: string) {
    if (!role || role.toLowerCase() === 'admin') {
      return prisma.notice.findMany({
        orderBy: { date: 'desc' },
      });
    }

    const r = role.toLowerCase();
    const rSingular = r.endsWith('s') ? r.slice(0, -1) : r;
    const rPlural = rSingular + 's';

    return prisma.notice.findMany({
      where: {
        OR: [
          { visibility: 'all' },
          { visibility: rSingular },
          { visibility: rPlural },
        ],
      },
      orderBy: { date: 'desc' },
    });
  }

  async getNoticeById(id: string) {
    return prisma.notice.findUnique({
      where: { id },
    });
  }

  async getNoticesByClass(classId: string) {
    return prisma.notice.findMany({
      where: {
        OR: [{ targetClassId: classId }, { visibility: 'all' }],
      },
      orderBy: { date: 'desc' },
    });
  }

  async getNoticesByRole(role: string) {
    return this.getNotices(role);
  }

  async getNoticesByClassAndSection(classId: string, sectionId: string) {
    return prisma.notice.findMany({
      where: {
        AND: [
          {
            OR: [{ targetClassId: classId }, { visibility: 'all' }],
          },
          {
            OR: [{ targetSectionId: sectionId }, { targetSectionId: null }],
          },
        ],
      },
      orderBy: { date: 'desc' },
    });
  }

  async getAdminNotices() {
    return prisma.notice.findMany({
      where: { senderRole: 'admin' },
      orderBy: { date: 'desc' },
    });
  }

  async getTeacherNotices() {
    return this.getNotices('teacher');
  }

  async updateNotice(id: string, data: any) {
    return prisma.notice.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.visibility && { visibility: data.visibility }),
        ...(data.targetClassId !== undefined && { targetClassId: data.targetClassId }),
        ...(data.targetSectionId !== undefined && { targetSectionId: data.targetSectionId }),
        ...(data.imageUri !== undefined && { imageUri: data.imageUri }),
      },
    });
  }

  async deleteNotice(id: string) {
    return prisma.notice.delete({ where: { id } });
  }

  async getNoticesByVisibility(visibility: string) {
    return prisma.notice.findMany({
      where: { visibility },
      orderBy: { date: 'desc' },
    });
  }

  async searchNotices(query: string) {
    return prisma.notice.findMany({
      where: {
        OR: [{ title: { contains: query } }, { content: { contains: query } }],
      },
      orderBy: { date: 'desc' },
    });
  }
}
