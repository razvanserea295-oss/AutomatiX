import fs from 'fs';
import * as CFB from 'cfb';





function findPng(data: CFB.CFB$Blob): Buffer | null {
  const buf = Buffer.isBuffer(data) ? (data as Buffer) : Buffer.from(data as number[]);
  for (let i = 0; i <= buf.length - 8; i++) {
    if (
      buf[i]   === 0x89 && buf[i+1] === 0x50 &&
      buf[i+2] === 0x4E && buf[i+3] === 0x47 &&
      buf[i+4] === 0x0D && buf[i+5] === 0x0A &&
      buf[i+6] === 0x1A && buf[i+7] === 0x0A
    ) {
      return buf.subarray(i);
    }
  }
  return null;
}

export class CadPreviewService {
  



  static extractThumbnail(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;

      const raw = fs.readFileSync(filePath);

      
      if (
        raw.length < 8 ||
        raw[0] !== 0xD0 || raw[1] !== 0xCF ||
        raw[2] !== 0x11 || raw[3] !== 0xE0
      ) {
        return null;
      }

      const cfb = CFB.read(raw, { type: 'buffer' });

      
      const previewEntry = CFB.find(cfb, 'PreviewPNG');
      if (previewEntry?.content) {
        const png = findPng(previewEntry.content);
        if (png) return png.toString('base64');
      }

      
      
      const SKIP_NAMES = new Set(['CONTENTS', 'SOLIDWORKS', '\x05SummaryInformation', '\x05DocumentSummaryInformation']);
      const MAX_SCAN_SIZE = 2 * 1024 * 1024; 

      for (const entry of cfb.FileIndex) {
        if (entry.type !== 2) continue; 
        if (!entry.content || entry.content.length < 100) continue;
        if (entry.content.length > MAX_SCAN_SIZE) continue;
        if (SKIP_NAMES.has(entry.name)) continue;

        const png = findPng(entry.content);
        if (png) return png.toString('base64');
      }

      return null;
    } catch {
      return null;
    }
  }
}
