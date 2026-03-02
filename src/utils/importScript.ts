import * as XLSX from 'xlsx';

export interface ImportedShot {
  shotNumber: string;
  shotType: string;
  duration: string;
  character: string;
  visual: string;
  dialogue: string;
  audio: string;
  directorNote: string;
}

export async function importScriptFile(file: File): Promise<ImportedShot[]> {
  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'xlsx' || ext === 'xls') {
    return importFromExcel(file);
  }

  if (ext === 'docx') {
    // Word 版本目前导入难度较高，这里暂时提示用户先从工具中导出 Excel 再导入
    throw new Error('暂不支持直接导入 Word，请先在本工具中导出 Excel 脚本后再导入。');
  }

  throw new Error('仅支持导入 Excel (.xlsx) 或 Word (.docx) 脚本文件');
}

async function importFromExcel(file: File): Promise<ImportedShot[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows.map((row, idx) => {
    const numRaw = String(row['镜号'] ?? '').trim() || String(idx + 1);
    const shotNumber = numRaw.padStart(2, '0');
    return {
      shotNumber,
      shotType: String(row['景别'] ?? '中景').trim() || '中景',
      duration: String(row['时长'] ?? '5s').trim() || '5s',
      character: String(row['角色'] ?? '').trim(),
      visual: String(row['画面描述'] ?? '').trim(),
      dialogue: String(row['台词'] ?? '').trim(),
      audio: String(row['音效'] ?? '').trim(),
      directorNote: String(row['导演备注'] ?? '').trim(),
    };
  }).filter(s => s.visual || s.dialogue || s.audio || s.directorNote);
}

