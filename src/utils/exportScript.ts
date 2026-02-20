import type { Shot } from '@/components/StoryboardCard';

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

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `脚本文档_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
