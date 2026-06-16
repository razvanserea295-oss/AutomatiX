import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { CommandError } from '../middleware/errors';
import fs from 'fs';


let XLSX: any = null;
function getXLSX() {
  if (!XLSX) XLSX = require('xlsx');
  return XLSX;
}

export function registerBomImportHandlers(): void {
  ipcRegister('read_excel_file', async (args: any) => {
    return withAuthenticatedUser(args?.token, () => {
      const filePath = args.file_path;
      const sheetName = args.sheet_name;

      if (!filePath || !fs.existsSync(filePath)) {
        throw CommandError.notFound('Fișierul nu a fost găsit');
      }

      const xlsx = getXLSX();
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        throw CommandError.badRequest('Fișierul nu conține niciun sheet');
      }

      const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        return { headers: [], rows: [], sheet_names: sheetNames };
      }

      const headers = (jsonData[0] as any[]).map((h: any) => String(h || ''));
      const rows = jsonData.slice(1).map((row: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
        return obj;
      });

      return { headers, rows, sheet_names: sheetNames };
    });
  });
}
