import * as fs from 'fs';
import * as path from 'path';

export function saveBase64Image(base64Data: string | null | undefined, subFolder = 'avatars', defaultExt = 'jpg'): string | null {
  if (!base64Data || typeof base64Data !== 'string') return null;
  // If already a URL or path, keep it
  if (!base64Data.startsWith('data:')) return base64Data;

  try {
    const matches = base64Data.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;

    const mimeType = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = defaultExt;
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('pdf')) ext = 'pdf';

    const filename = `${subFolder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetDir = path.join(process.cwd(), 'uploads', subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);

    return `/uploads/${subFolder}/${filename}`;
  } catch (err) {
    console.error('[file-saver] Error saving base64 image:', err);
    return base64Data;
  }
}
