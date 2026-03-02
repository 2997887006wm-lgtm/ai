import { useRef } from 'react';
import type { Shot } from './StoryboardCard';
import type { TreeNode } from './DraggableScriptTree';
import { X, FileDown, FileText, Table, Printer, FileType, Captions, ScrollText, FileUp } from 'lucide-react';
import { exportAsMarkdown, exportAsExcel, exportAsPdf, exportAsWord, exportAsLrc, exportAsFountain } from '@/utils/exportScript';
import { importScriptFile, type ImportedShot } from '@/utils/importScript';
import { toast } from 'sonner';

interface ScriptPreviewSidebarProps {
  visible: boolean;
  shots: Shot[];
  onClose: () => void;
  scriptTree?: TreeNode;
  sceneShotsMap?: Record<string, Shot[]>;
  durationType?: 'short' | 'long';
  onImport?: (shots: ImportedShot[]) => void;
}

/** Find the label for a scene id by traversing the tree */
function findNodeLabel(tree: TreeNode, id: string): string | null {
  if (tree.id === id) return tree.label;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeLabel(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function ScriptPreviewSidebar({ visible, shots, onClose, scriptTree, sceneShotsMap, durationType, onImport }: ScriptPreviewSidebarProps) {
  if (!visible) return null;

  const isLong = durationType === 'long' && scriptTree && sceneShotsMap;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex animate-slide-in-right">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-[480px] max-w-[90vw] h-full bg-card border-l border-border shadow-elevated flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-sm font-serif-cn text-foreground">全脚本预览</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="从 Excel / Word 导入脚本"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-[11px]"
            >
              <FileUp size={13} strokeWidth={1.5} />
              <span>导入</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.docx"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const imported = await importScriptFile(file);
                  if (!imported.length) {
                    toast.error('文件中没有可用的分镜数据');
                    return;
                  }
                  if (!onImport) {
                    toast.error('当前页面不支持导入到分镜面板');
                    return;
                  }
                  onImport(imported);
                  toast.success('脚本已从文件导入，可在分镜面板中继续编辑');
                } catch (err: any) {
                  toast.error(err?.message || '导入失败，请确认文件是从本工具导出的 Excel/Word 脚本');
                } finally {
                  e.target.value = '';
                  onClose();
                }
              }}
            />
            <ExportButton icon={FileText} label="Markdown" onClick={() => exportAsMarkdown(shots)} />
            <ExportButton icon={Table} label="Excel" onClick={() => exportAsExcel(shots)} />
            <ExportButton icon={FileType} label="Word" onClick={() => exportAsWord(shots)} />
            <ExportButton icon={Printer} label="PDF" onClick={() => exportAsPdf(shots)} />
            <ExportButton icon={Captions} label="LRC" onClick={() => exportAsLrc(shots)} />
            <ExportButton icon={ScrollText} label="Fountain" onClick={() => exportAsFountain(shots)} />
            <button onClick={onClose} className="ml-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-serif-cn text-foreground mb-1">脚本文档</h1>
            <p className="text-xs text-muted-foreground">
              共 {isLong ? Object.values(sceneShotsMap!).flat().length : shots.length} 个分镜 · {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>

          {isLong ? (
            // Long-form: render by acts and scenes
            <div className="space-y-8">
              {scriptTree!.children?.map((act) => (
                <div key={act.id}>
                  {/* Act header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-primary/20">
                    <span className="w-1.5 h-5 rounded-full bg-primary/60" />
                    <h2 className="text-base font-serif-cn font-semibold text-foreground">{act.label}</h2>
                  </div>

                  {act.children?.map((scene) => {
                    const sceneShots = sceneShotsMap![scene.id] || [];
                    return (
                      <div key={scene.id} className="mb-6">
                        {/* Scene header */}
                        <div className="flex items-center gap-2 mb-3 ml-4">
                          <span className="w-1 h-4 rounded-full bg-muted-foreground/30" />
                          <h3 className="text-sm font-serif-cn text-foreground/80">{scene.label}</h3>
                          <span className="text-[10px] text-muted-foreground/50">{sceneShots.length} 镜</span>
                        </div>
                        <div className="space-y-4 ml-4">
                          {sceneShots.map((shot) => (
                            <ShotPreviewCard key={shot.id} shot={shot} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {shots.map((shot) => (
                <ShotPreviewCard key={shot.id} shot={shot} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShotPreviewCard({ shot }: { shot: Shot }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-background">
      <div className="flex items-center gap-3 mb-3">
        {shot.transition && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/60">
            {shot.transition}
          </span>
        )}
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
  );
}

function ExportButton({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`导出 ${label}`}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-[11px]"
    >
      <Icon size={13} strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );
}
