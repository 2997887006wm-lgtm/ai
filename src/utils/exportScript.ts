import type { Shot } from '@/components/StoryboardCard';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

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
