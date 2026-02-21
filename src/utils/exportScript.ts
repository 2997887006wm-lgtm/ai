import type { Shot } from '@/components/StoryboardCard';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/* ── Markdown ─────────────────────────────────── */

export function exportAsMarkdown(shots: Shot[]) {
  const lines: string[] = [];
  lines.push('# 脚本文档\n');
  lines.push(`> 共 ${shots.length} 个分镜 · 导出时间：${new Date().toLocaleString('zh-CN')}\n`);
  lines.push('---\n');

  shots.forEach((shot) => {
    lines.push(`## 分镜 ${shot.shotNumber}\n`);
    lines.push(`| 项目 | 内容 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| **景别** | ${shot.shotType} |`);
    lines.push(`| **时长** | ${shot.duration} |`);
    if (shot.character) lines.push(`| **角色** | ${shot.character} |`);
    lines.push(`| **画面** | ${shot.visual} |`);
    if (shot.dialogue) lines.push(`| **台词** | ${shot.dialogue} |`);
    if (shot.audio) lines.push(`| **音效** | ${shot.audio} |`);
    if (shot.directorNote) lines.push(`| **导演备注** | ${shot.directorNote} |`);
    lines.push('');
  });

  download(lines.join('\n'), 'text/markdown;charset=utf-8', `脚本文档_${dateSuffix()}.md`);
}

/* ── Excel ────────────────────────────────────── */

export function exportAsExcel(shots: Shot[]) {
  const rows = shots.map((s) => ({
    '镜号': s.shotNumber,
    '景别': s.shotType,
    '时长': s.duration,
    '角色': s.character,
    '画面描述': s.visual,
    '台词': s.dialogue,
    '音效': s.audio,
    '导演备注': s.directorNote,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Set column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 8 }, { wch: 6 }, { wch: 12 },
    { wch: 40 }, { wch: 30 }, { wch: 20 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '脚本');
  XLSX.writeFile(wb, `脚本文档_${dateSuffix()}.xlsx`);
}

/* ── PDF ──────────────────────────────────────── */

export function exportAsPdf(shots: Shot[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load a font that supports CJK — we use the built-in helvetica as fallback,
  // but since jsPDF doesn't ship CJK fonts we render via html workaround:
  // Instead we create a printable HTML and use browser print-to-pdf.
  const html = buildPrintableHtml(shots);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    // Auto-trigger print dialog which allows saving as PDF
    win.onload = () => win.print();
  }
}

function buildPrintableHtml(shots: Shot[]): string {
  const rows = shots.map((s) => `
    <tr>
      <td>${s.shotNumber}</td>
      <td>${s.shotType}</td>
      <td>${s.duration}</td>
      <td>${s.character || '—'}</td>
      <td>${s.visual}</td>
      <td>${s.dialogue || '—'}</td>
      <td>${s.audio || '—'}</td>
      <td>${s.directorNote || '—'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>脚本文档</title>
<style>
  body { font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif; padding: 20mm; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #888; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  @media print { body { padding: 10mm; } }
</style>
</head>
<body>
  <h1>脚本文档</h1>
  <p class="meta">共 ${shots.length} 个分镜 · ${new Date().toLocaleString('zh-CN')}</p>
  <table>
    <thead>
      <tr><th>镜号</th><th>景别</th><th>时长</th><th>角色</th><th>画面描述</th><th>台词</th><th>音效</th><th>导演备注</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

/* ── Word (.docx) ─────────────────────────────── */

export async function exportAsWord(shots: Shot[]) {
  const headerCells = ['镜号', '景别', '时长', '角色', '画面描述', '台词', '音效', '导演备注'];
  
  const headerRow = new TableRow({
    children: headerCells.map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Microsoft YaHei' })] })],
      shading: { fill: 'f0f0f0' },
    })),
  });

  const dataRows = shots.map(s => new TableRow({
    children: [
      s.shotNumber, s.shotType, s.duration, s.character || '—',
      s.visual, s.dialogue || '—', s.audio || '—', s.directorNote || '—',
    ].map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: 'Microsoft YaHei' })] })],
    })),
  }));

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: '脚本文档', bold: true, size: 36, font: 'Microsoft YaHei' })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `共 ${shots.length} 个分镜 · ${new Date().toLocaleString('zh-CN')}`, size: 18, color: '888888', font: 'Microsoft YaHei' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `脚本文档_${dateSuffix()}.docx`);
}

/* ── Legacy TXT (kept for backward compat) ────── */

export function exportScriptDocument(shots: Shot[]) {
  const lines: string[] = [];
  lines.push('═══════════════════════════════════════');
  lines.push('         脚 本 文 档');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  shots.forEach((shot) => {
    lines.push(`── 分镜 ${shot.shotNumber} ──────────────────────`);
    lines.push(`景别：${shot.shotType}`);
    lines.push(`时长：${shot.duration}`);
    if (shot.character) lines.push(`角色：${shot.character}`);
    lines.push(`画面：${shot.visual}`);
    if (shot.dialogue) lines.push(`台词：${shot.dialogue}`);
    if (shot.audio) lines.push(`音效：${shot.audio}`);
    if (shot.directorNote) lines.push(`导演备注：${shot.directorNote}`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════');
  lines.push(`共 ${shots.length} 个分镜`);

  download(lines.join('\n'), 'text/plain;charset=utf-8', `脚本文档_${dateSuffix()}.txt`);
}

/* ── LRC ─────────────────────────────────────── */

export function exportAsLrc(shots: Shot[]) {
  const lines: string[] = [];
  lines.push('[ti:脚本文档]');
  lines.push(`[by:导演工具]`);
  lines.push('');

  let accumulatedMs = 0;

  shots.forEach((shot) => {
    const tag = formatLrcTime(accumulatedMs);
    // Use dialogue if available, otherwise use visual description
    const text = shot.dialogue || shot.visual;
    lines.push(`${tag}${text}`);

    // Parse duration to milliseconds for next timestamp
    const durationSec = parseDurationToSeconds(shot.duration);
    accumulatedMs += durationSec * 1000;
  });

  download(lines.join('\n'), 'text/plain;charset=utf-8', `脚本文档_${dateSuffix()}.lrc`);
}

function formatLrcTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const centisec = Math.floor((ms % 1000) / 10);
  return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centisec).padStart(2, '0')}]`;
}

function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 5;
}

/* ── Helpers ──────────────────────────────────── */

function dateSuffix() {
  return new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
}

function download(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
