import type { Shot } from './StoryboardCard';
import { X, FileDown, FileText, Table, Printer } from 'lucide-react';
import { exportAsMarkdown, exportAsExcel, exportAsPdf } from '@/utils/exportScript';

interface ScriptPreviewSidebarProps {
  visible: boolean;
  shots: Shot[];
  onClose: () => void;
}

export function ScriptPreviewSidebar({ visible, shots, onClose }: ScriptPreviewSidebarProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex animate-slide-in-right">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-[480px] max-w-[90vw] h-full bg-card border-l border-border shadow-elevated flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-sm font-serif-cn text-foreground">全脚本预览</h3>
          <div className="flex items-center gap-2">
            <ExportButton icon={FileText} label="Markdown" onClick={() => exportAsMarkdown(shots)} />
            <ExportButton icon={Table} label="Excel" onClick={() => exportAsExcel(shots)} />
            <ExportButton icon={Printer} label="PDF" onClick={() => exportAsPdf(shots)} />
            <button
              onClick={onClose}
              className="ml-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Script content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-serif-cn text-foreground mb-1">脚本文档</h1>
            <p className="text-xs text-muted-foreground">
              共 {shots.length} 个分镜 · {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>

          <div className="space-y-6">
            {shots.map((shot) => (
              <div key={shot.id} className="border border-border rounded-lg p-4 bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono bg-secondary text-foreground px-2 py-0.5 rounded">
                    #{shot.shotNumber}
                  </span>
                  <span className="text-xs font-medium text-foreground">{shot.shotType}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{shot.duration}</span>
                </div>

                {shot.character && (
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">角色</span>
                    <p className="text-xs text-foreground mt-0.5">{shot.character}</p>
                  </div>
                )}

                <div className="mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">画面</span>
                  <p className="text-xs text-foreground mt-0.5 leading-relaxed">{shot.visual}</p>
                </div>

                {shot.dialogue && (
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">台词</span>
                    <p className="text-xs text-foreground mt-0.5 italic">"{shot.dialogue}"</p>
                  </div>
                )}

                {shot.audio && (
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">音效</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{shot.audio}</p>
                  </div>
                )}

                {shot.directorNote && (
                  <div className="border-t border-border pt-2 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">导演备注</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{shot.directorNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`导出 ${label}`}
      className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <Icon size={14} strokeWidth={1.5} />
    </button>
  );
}
