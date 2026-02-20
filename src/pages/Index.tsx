import { useState, useCallback, useRef, useEffect } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InspirationInput } from '@/components/InspirationInput';
import { StyleDrawer } from '@/components/StyleDrawer';
import { StoryboardPanel } from '@/components/StoryboardPanel';
import { CreditsModal } from '@/components/CreditsModal';
import { HistoryPanel } from '@/components/HistoryPanel';
import { DraggableScriptTree, type TreeNode } from '@/components/DraggableScriptTree';
import { AudioLibraryPanel } from '@/components/AudioLibraryPanel';
import { ScriptPreviewSidebar } from '@/components/ScriptPreviewSidebar';
import { Music, Video } from 'lucide-react';
import { playClick } from '@/utils/audio';
import type { Shot } from '@/components/StoryboardCard';

let nextShotId = 100;

const CN_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const MOCK_SHORT_SHOTS: Shot[] = [
  { id: 1, shotNumber: '01', shotType: '大远景', visual: '晨雾弥漫的山谷，一条蜿蜒小路隐入远方的松林', duration: '8s', dialogue: '', audio: '远处鸟鸣，风穿过松针的沙沙声', character: '', directorNote: '以缓慢推进开场，建立孤独而宁静的情绪基底' },
  { id: 2, shotNumber: '02', shotType: '中景', visual: '一双旧布鞋踩过露湿的碎石路，步伐从容', duration: '5s', dialogue: '', audio: '碎石轻响，布料摩擦', character: '行者 — 年约四十，面容平静', directorNote: '不露面容，仅以脚步暗示人物性格' },
  { id: 3, shotNumber: '03', shotType: '特写', visual: '手指轻触路旁一株野花，露珠滑落', duration: '4s', dialogue: '（旁白）有些路，走过便是全部的意义。', audio: '水滴落入溪面的轻微声响', character: '', directorNote: '这是情感锚点，画面节奏在此凝滞片刻' },
  { id: 4, shotNumber: '04', shotType: '远景', visual: '行者的背影渐行渐远，阳光从云层缝隙倾泻而下', duration: '6s', dialogue: '', audio: '弦乐缓缓渐入，如叹息般温柔', character: '', directorNote: '自然光是最好的演员。等待真实的丁达尔光线' },
];

/** Renumber tree labels after reorder */
function renumberTree(node: TreeNode): TreeNode {
  if (!node.children) return node;
  const children = node.children.map((child, i) => {
    const num = CN_NUMBERS[i] || String(i + 1);
    let newLabel = child.label;
    const actMatch = child.label.match(/^第.+?幕\s*·?\s*(.*)/);
    const sceneMatch = child.label.match(/^场景.+?\s*·?\s*(.*)/);
    if (actMatch) {
      newLabel = `第${num}幕 · ${actMatch[1]}`;
    } else if (sceneMatch) {
      newLabel = `场景${num} · ${sceneMatch[1]}`;
    }
    return renumberTree({ ...child, label: newLabel });
  });
  return { ...node, children };
}

/** Get all leaf node ids from tree */
function getLeafIds(node: TreeNode): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  return node.children.flatMap(getLeafIds);
}

/** Get first leaf id */
function getFirstLeafId(node: TreeNode): string | null {
  if (!node.children || node.children.length === 0) return node.id;
  return getFirstLeafId(node.children[0]);
}

type Phase = 'input' | 'style' | 'storyboard';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'videos'>('new');
  const [phase, setPhase] = useState<Phase>('input');
  const [credits, setCredits] = useState(15);
  const [showCredits, setShowCredits] = useState(false);
  const [showAudioLib, setShowAudioLib] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationType, setDurationType] = useState<'short' | 'long'>('short');
  const [shots, setShots] = useState<Shot[]>(MOCK_SHORT_SHOTS);
  const [activeTreeNode, setActiveTreeNode] = useState<string | null>(null);
  const [scriptTree, setScriptTree] = useState<TreeNode>({ id: 'root', label: '总纲', children: [] });
  const [sceneShotsMap, setSceneShotsMap] = useState<Record<string, Shot[]>>({});
  const [videoGenerating, setVideoGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // For long-form mode: sync shots from sceneShotsMap when activeTreeNode changes
  useEffect(() => {
    if (durationType === 'long' && activeTreeNode && sceneShotsMap[activeTreeNode]) {
      setShots(sceneShotsMap[activeTreeNode]);
    }
  }, [activeTreeNode, durationType, sceneShotsMap]);

  // For long-form: persist shot edits back to sceneShotsMap
  const syncShotsToMap = useCallback((updatedShots: Shot[]) => {
    if (durationType === 'long' && activeTreeNode) {
      setSceneShotsMap(prev => ({ ...prev, [activeTreeNode]: updatedShots }));
    }
  }, [durationType, activeTreeNode]);

  const handleGenerate = useCallback(async (inspiration: string, duration: 'short' | 'long', mood: string) => {
    setDurationType(duration);
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { inspiration, duration, mood },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (duration === 'long') {
        // Long-form: parse tree + sceneShotsMap
        if (data?.tree && data?.sceneShotsMap) {
          setScriptTree(data.tree);
          const parsedMap: Record<string, Shot[]> = {};
          for (const [sceneId, rawShots] of Object.entries(data.sceneShotsMap)) {
            parsedMap[sceneId] = (rawShots as any[]).map((s: any, i: number) => ({
              id: nextShotId++,
              shotNumber: String(i + 1).padStart(2, '0'),
              shotType: s.shotType || '中景',
              visual: s.visual || '',
              duration: s.duration || '5s',
              dialogue: s.dialogue || '',
              audio: s.audio || '',
              character: s.character || '',
              directorNote: s.directorNote || '',
            }));
          }
          setSceneShotsMap(parsedMap);
          const firstLeaf = getFirstLeafId(data.tree);
          setActiveTreeNode(firstLeaf);
          if (firstLeaf && parsedMap[firstLeaf]) {
            setShots(parsedMap[firstLeaf]);
          }
        }
      } else {
        // Short-form
        if (data?.shots && Array.isArray(data.shots)) {
          const parsed: Shot[] = data.shots.map((s: any, i: number) => ({
            id: nextShotId++,
            shotNumber: String(i + 1).padStart(2, '0'),
            shotType: s.shotType || '中景',
            visual: s.visual || '',
            duration: s.duration || '5s',
            dialogue: s.dialogue || '',
            audio: s.audio || '',
            character: s.character || '',
            directorNote: s.directorNote || '',
          }));
          setShots(parsed);
        }
      }
      setPhase('style');
    } catch (e: any) {
      console.error('Script generation error:', e);
      toast.error(e.message || '脚本生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleStyleSelect = useCallback((_styleId: string) => {
    setPhase('storyboard');
  }, []);

  const handleUpdateShot = useCallback((id: number, field: keyof Shot, value: string) => {
    setShots((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      return updated;
    });
    // Also sync to map for long-form
    if (durationType === 'long' && activeTreeNode) {
      setSceneShotsMap(prev => {
        const current = prev[activeTreeNode] || [];
        return { ...prev, [activeTreeNode]: current.map(s => s.id === id ? { ...s, [field]: value } : s) };
      });
    }
  }, [durationType, activeTreeNode]);

  const handleReorderShots = useCallback((activeId: number, overId: number) => {
    setShots((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === activeId);
      const newIndex = prev.findIndex((s) => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      const renumbered = next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
      return renumbered;
    });
  }, []);

  const handleDeleteShot = useCallback((id: number) => {
    setShots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const renumbered = next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
      return renumbered;
    });
  }, []);

  const handleInsertShot = useCallback((afterId: number) => {
    setShots((prev) => {
      const idx = prev.findIndex((s) => s.id === afterId);
      if (idx === -1) return prev;
      const newShot: Shot = {
        id: nextShotId++,
        shotNumber: '',
        shotType: '中景',
        visual: '',
        duration: '5s',
        dialogue: '',
        audio: '',
        character: '',
        directorNote: '',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newShot);
      return next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
    });
  }, []);

  const handleAddShot = useCallback(() => {
    setShots((prev) => {
      const newShot: Shot = {
        id: nextShotId++,
        shotNumber: String(prev.length + 1).padStart(2, '0'),
        shotType: '中景',
        visual: '',
        duration: '5s',
        dialogue: '',
        audio: '',
        character: '',
        directorNote: '',
      };
      return [...prev, newShot];
    });
  }, []);

  // After shots change in long-form mode, sync back
  useEffect(() => {
    if (durationType === 'long' && activeTreeNode) {
      syncShotsToMap(shots);
    }
  }, [shots, durationType, activeTreeNode, syncShotsToMap]);

  const handleTreeNodeSelect = useCallback((id: string) => {
    // Only select leaf nodes (scenes), not act nodes
    const leaves = getLeafIds(scriptTree);
    if (leaves.includes(id)) {
      setActiveTreeNode(id);
    }
  }, [scriptTree]);

  const handleTreeReorder = useCallback((parentId: string, activeId: string, overId: string) => {
    const reorderChildren = (node: TreeNode): TreeNode => {
      if (node.id === parentId && node.children) {
        const children = [...node.children];
        const oldIdx = children.findIndex(c => c.id === activeId);
        const newIdx = children.findIndex(c => c.id === overId);
        if (oldIdx !== -1 && newIdx !== -1) {
          const [moved] = children.splice(oldIdx, 1);
          children.splice(newIdx, 0, moved);
        }
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: node.children.map(reorderChildren) };
      }
      return node;
    };
    setScriptTree(prev => renumberTree(reorderChildren(prev)));
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (videoGenerating) return;
    setVideoGenerating(true);

    // Build a combined prompt from all shots
    const allShots = durationType === 'long'
      ? Object.values(sceneShotsMap).flat()
      : shots;

    const prompt = allShots.map((s, i) =>
      `镜头${i + 1}(${s.shotType}): ${s.visual}${s.dialogue ? ` 台词：${s.dialogue}` : ''}`
    ).join('；');

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { action: 'submit', prompt },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const taskId = data?.taskId;
      if (!taskId) throw new Error('未获取到视频任务ID');

      toast.info('视频生成任务已提交，预计需要2-5分钟...');
      setCredits((c) => Math.max(0, c - 5));

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const { data: pollData, error: pollError } = await supabase.functions.invoke('generate-video', {
            body: { action: 'poll', taskId },
          });
          if (pollError || pollData?.error) {
            console.error('Poll error:', pollError || pollData?.error);
            return;
          }
          if (pollData?.status === 'SUCCESS' && pollData?.videoUrl) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setVideoGenerating(false);
            toast.success('视频生成完成！');
            window.open(pollData.videoUrl, '_blank');
          } else if (pollData?.status === 'FAIL') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setVideoGenerating(false);
            toast.error('视频生成失败，请重试');
          }
        } catch {
          // ignore transient poll errors
        }
      }, 10000);
    } catch (e: any) {
      console.error('Video generation error:', e);
      toast.error(e.message || '视频生成失败');
      setVideoGenerating(false);
    }
  }, [shots, sceneShotsMap, durationType, videoGenerating]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleNewProject = () => {
    setActiveTab('new');
    setPhase('input');
    setShots(MOCK_SHORT_SHOTS);
    setScriptTree({ id: 'root', label: '总纲', children: [] });
    setSceneShotsMap({});
    setActiveTreeNode(null);
  };

  // Get all shots for preview (long-form: all scenes combined)
  const allShotsForPreview = durationType === 'long'
    ? Object.values(sceneShotsMap).flat()
    : shots;

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar
        credits={credits}
        onNewProject={handleNewProject}
        onHistory={() => setActiveTab('history')}
        onVideoLibrary={() => setActiveTab('videos')}
        onCreditsClick={() => setShowCredits(true)}
        activeTab={activeTab}
      />

      <main className="flex-1 min-h-screen bg-background overflow-y-auto">
        {activeTab === 'history' ? (
          <div className="px-12 py-16">
            <HistoryPanel />
          </div>
        ) : activeTab === 'videos' ? (
          <div className="px-12 py-16">
            <h1 className="text-2xl font-serif-cn font-medium text-foreground mb-2">视频库</h1>
            <p className="text-sm text-muted-foreground mb-8">在这里查看所有已生成的视频</p>
            <div className="text-center py-20 text-muted-foreground text-sm">
              <Video size={32} className="mx-auto mb-3 opacity-30" />
              暂无已生成的视频
            </div>
          </div>
        ) : (
          <div className="px-12 py-16">
            {phase === 'input' && (
              <div className="max-w-3xl mx-auto mb-16 animate-fade-in">
                <h1 className="text-2xl font-serif-cn font-medium text-foreground mb-2">脚本工作台</h1>
                <p className="text-sm text-muted-foreground">从一粒灵感的种子，生长为完整的视觉叙事</p>
              </div>
            )}

            {phase === 'input' && (
              <InspirationInput onGenerate={handleGenerate} isGenerating={isGenerating} />
            )}

            {phase === 'storyboard' && durationType === 'long' && (
              <div className="flex gap-8 max-w-5xl mx-auto">
                <div className="w-56 shrink-0 animate-fade-in">
                  <DraggableScriptTree
                    tree={scriptTree}
                    activeId={activeTreeNode}
                    onSelect={handleTreeNodeSelect}
                    onReorder={handleTreeReorder}
                  />
                </div>
                <div className="flex-1 animate-slide-in-right">
                  <StoryboardPanel
                    shots={shots}
                    onUpdateShot={handleUpdateShot}
                    onReorderShots={handleReorderShots}
                    onDeleteShot={handleDeleteShot}
                    onInsertShot={handleInsertShot}
                    onAddShot={handleAddShot}
                    credits={credits}
                    onPreview={() => setShowPreview(true)}
                    onGenerateVideo={handleGenerateVideo}
                  />
                </div>
              </div>
            )}

            {phase === 'storyboard' && durationType === 'short' && (
              <StoryboardPanel
                shots={shots}
                onUpdateShot={handleUpdateShot}
                onReorderShots={handleReorderShots}
                onDeleteShot={handleDeleteShot}
                onInsertShot={handleInsertShot}
                onAddShot={handleAddShot}
                credits={credits}
                onPreview={() => setShowPreview(true)}
                onGenerateVideo={handleGenerateVideo}
              />
            )}
          </div>
        )}

        {/* Floating audio lib button */}
        {phase === 'storyboard' && (
          <button
            onClick={() => { playClick(); setShowAudioLib(true); }}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-scarlet hover:shadow-elevated transition-all duration-500 z-40"
            title="音效与音乐库"
          >
            <Music size={18} strokeWidth={1.5} />
          </button>
        )}
      </main>

      <StyleDrawer
        visible={phase === 'style'}
        onSelect={handleStyleSelect}
        onClose={() => setPhase('input')}
      />

      <CreditsModal
        visible={showCredits}
        credits={credits}
        onClose={() => setShowCredits(false)}
      />

      <AudioLibraryPanel
        visible={showAudioLib}
        onClose={() => setShowAudioLib(false)}
      />

      <ScriptPreviewSidebar
        visible={showPreview}
        shots={allShotsForPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
};

export default Index;
