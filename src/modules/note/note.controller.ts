import * as noteService from './note.service';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { prisma } from '../../prisma';

export async function getAll(request: any, reply: any) {
  try {
    const { sectionId, subjectId } = request.query;
    const data = await noteService.getAllNotes(sectionId, subjectId);
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function getById(request: any, reply: any) {
  try {
    const data = await noteService.getNoteById(request.params.id);
    if (!data) return reply.status(404).send({ error: 'Note not found' });
    reply.status(200).send(data);
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

function saveBase64ToFile(base64Data: string, subFolder: string, defaultExt = 'pdf'): string {
  if (!base64Data || typeof base64Data !== 'string') return '';
  if (!base64Data.startsWith('data:')) return base64Data;

  try {
    const matches = base64Data.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;

    const mimeType = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = defaultExt;
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetDir = path.join(process.cwd(), 'uploads', subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);

    return `/uploads/${subFolder}/${filename}`;
  } catch (err) {
    console.error('Error saving base64 note file:', err);
    return base64Data;
  }
}

export async function upload(request: any, reply: any) {
  try {
    if (request.isMultipart && request.isMultipart()) {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const fields = data.fields;
      const sectionId = fields.sectionId?.value;
      const subjectId = fields.subjectId?.value;
      let teacherId = fields.teacherId?.value;
      const title = fields.title?.value;

      if (!sectionId || !subjectId || !title) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      if (!teacherId) {
        if (request.user?.role === 'teacher') {
          const t = await prisma.teacherProfile.findUnique({ where: { userId: request.user.id } });
          teacherId = t?.id;
        }
        if (!teacherId) {
          const firstTeacher = await prisma.teacherProfile.findFirst();
          teacherId = firstTeacher?.id;
        }
      }

      const filename = `${Date.now()}-${data.filename}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'notes');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      await pipeline(data.file, writeStream);

      const fileUrl = `/uploads/notes/${filename}`;

      let fileType = 'FILE';
      if (data.mimetype && data.mimetype.includes('pdf')) fileType = 'PDF';
      else if (data.mimetype && data.mimetype.includes('image')) fileType = 'IMAGE';

      const note = await noteService.createNote({
        sectionId,
        subjectId,
        teacherId,
        title,
        fileUrl,
        fileType,
      });

      return reply.status(201).send(note);
    } else {
      // JSON body upload
      const { sectionId, subjectId, teacherId, title, fileUrl, fileType } = request.body || {};
      if (!sectionId || !subjectId || !title) {
        return reply.status(400).send({ error: 'Missing required fields: sectionId, subjectId, title' });
      }

      let actualTeacherId = teacherId;
      if (!actualTeacherId) {
        if (request.user?.role === 'teacher') {
          const t = await prisma.teacherProfile.findUnique({ where: { userId: request.user.id } });
          actualTeacherId = t?.id;
        }
        if (!actualTeacherId) {
          const firstT = await prisma.teacherProfile.findFirst();
          actualTeacherId = firstT?.id;
        }
      }

      const savedUrl = saveBase64ToFile(fileUrl || '', 'notes', fileType === 'IMAGE' ? 'jpg' : 'pdf');

      const note = await noteService.createNote({
        sectionId,
        subjectId,
        teacherId: actualTeacherId,
        title,
        fileUrl: savedUrl,
        fileType: fileType || 'DOCUMENT',
      });

      return reply.status(201).send(note);
    }
  } catch (error: any) {
    console.error('Note upload error:', error);
    return reply.status(500).send({ error: error.message || 'Internal Server Error' });
  }
}

export async function deleteNote(request: any, reply: any) {
  try {
    const id = request.params.id;
    const note = await noteService.getNoteById(id);
    if (!note) return reply.status(404).send({ error: 'Note not found' });

    if (note.fileUrl && !note.fileUrl.startsWith('data:')) {
      const cleanPath = note.fileUrl.replace(/^[\/\\]/, '');
      const filePath = path.join(process.cwd(), cleanPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await noteService.deleteNote(id);
    reply.status(200).send({ message: 'Deleted successfully' });
  } catch (error) {
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}
