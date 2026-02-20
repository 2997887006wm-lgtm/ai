import { useState, useCallback } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { InspirationInput } from '@/components/InspirationInput';
import { StyleDrawer } from '@/components/StyleDrawer';
import { StoryboardPanel } from '@/components/StoryboardPanel';
import { CreditsModal } from '@/components/CreditsModal';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ScriptTreeNode, type TreeNode } from '@/components/ScriptTreeNode';
import type { Shot } from '@/components/StoryboardCard';

const MOCK_SHORT_SHOTS: Shot[] = [
  { id: 1, shotNumber: '01', shotType: '大远景', visual: '晨雾弥漫的山谷，一条蜿蜒小路隐入远方的松林', duration: '8s', dialogue: '', audio: '远处鸟鸣，风穿过松针的沙沙声', character: '', directorNote: '以缓慢推进开场，建立孤独而宁静的情绪基底' },
  { id: 2, shotNumber: '02', shotType: '中景', visual: '一双旧布鞋踩过露湿的碎石路，步伐从容', duration: '5s', dialogue: '', audio: '碎石轻响，布料摩擦', character: '行者 — 年约四十，面容平静', directorNote: '不露面容，仅以脚步暗示人物性格' },
  { id: 3, shotNumber: '03', shotType: '特写', visual: '手指轻触路旁一株野花，露珠滑落', duration: '4s', dialogue: '（旁白）有些路，走过便是全部的意义。', audio: '水滴落入溪面的轻微声响', character: '', directorNote: '这是情感锚点，画面节奏在此凝滞片刻' },
  { id: 4, shotNumber: '04', shotType: '远景', visual: '行者的背影渐行渐远，阳光从云层缝隙倾泻而下', duration: '6s', dialogue: '', audio: '弦乐缓缓渐入，如叹息般温柔', character: '', directorNote: '自然光是最好的演员。等待真实的丁达尔光线' },
];

const MOCK_TREE: TreeNode = {
  id: 'root',
  label: '第一幕 · 序章',
  children: [
    { id: 'act1-s1', label: '场景一 · 晨间山谷' },
    { id: 'act1-s2', label: '场景二 · 林间小径' },
    {
      id: 'act2',
      label: '第二幕 · 转折',
      children: [
        { id: 'act2-s1', label: '场景三 · 溪畔驻足' },
        { id: 'act2-s2', label: '场景四 · 远方来信' },
      ],
    },
    { id: 'act3', label: '第三幕 · 归途' },
  ],
};

type Phase = 'input' | 'style' | 'storyboard';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [phase, setPhase] = useState<Phase>('input');
  const [credits, setCredits] = useState(15);
  const [showCredits, setShowCredits] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationType, setDurationType] = useState<'short' | 'long'>('short');
  const [shots, setShots] = useState<Shot[]>(MOCK_SHORT_SHOTS);
  const [activeTreeNode, setActiveTreeNode] = useState<string | null>('act1-s1');

  const handleGenerate = useCallback((_inspiration: string, duration: 'short' | 'long') => {
    setDurationType(duration);
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPhase('style');
    }, 1200);
  }, []);

  const handleStyleSelect = useCallback((_styleId: string) => {
    setPhase('storyboard');
  }, []);

  const handleUpdateShot = useCallback((id: number, field: keyof Shot, value: string) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const handleReorderShots = useCallback((activeId: number, overId: number) => {
    setShots((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === activeId);
      const newIndex = prev.findIndex((s) => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
    });
  }, []);

  const handleNewProject = () => {
    setActiveTab('new');
    setPhase('input');
    setShots(MOCK_SHORT_SHOTS);
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar
        credits={credits}
        onNewProject={handleNewProject}
        onHistory={() => setActiveTab('history')}
        onCreditsClick={() => setShowCredits(true)}
        activeTab={activeTab}
      />

      <main className="flex-1 min-h-screen bg-background overflow-y-auto">
        {activeTab === 'history' ? (
          <div className="px-12 py-16">
            <HistoryPanel />
          </div>
        ) : (
          <div className="px-12 py-16">
            {/* Title area */}
            {phase === 'input' && (
              <div className="max-w-3xl mx-auto mb-16 animate-fade-in">
                <h1 className="text-2xl font-serif-cn font-medium text-foreground mb-2">剧本工作台</h1>
                <p className="text-sm text-muted-foreground">从一粒灵感的种子，生长为完整的视觉叙事</p>
              </div>
            )}

            {phase === 'input' && (
              <InspirationInput onGenerate={handleGenerate} isGenerating={isGenerating} />
            )}

            {phase === 'storyboard' && durationType === 'long' && (
              <div className="flex gap-8 max-w-5xl mx-auto">
                {/* Tree sidebar */}
                <div className="w-56 shrink-0 animate-fade-in">
                  <p className="text-xs text-muted-foreground/50 mb-4 uppercase tracking-widest">剧本结构</p>
                  <ScriptTreeNode
                    node={MOCK_TREE}
                    activeId={activeTreeNode}
                    onSelect={setActiveTreeNode}
                  />
                </div>
                {/* Storyboard */}
                <div className="flex-1 animate-slide-in-right">
                  <StoryboardPanel
                    shots={shots}
                    onUpdateShot={handleUpdateShot}
                    onReorderShots={handleReorderShots}
                    credits={credits}
                    onExport={() => {}}
                    onGenerateVideo={() => setCredits((c) => Math.max(0, c - 5))}
                  />
                </div>
              </div>
            )}

            {phase === 'storyboard' && durationType === 'short' && (
              <StoryboardPanel
                shots={shots}
                onUpdateShot={handleUpdateShot}
                onReorderShots={handleReorderShots}
                credits={credits}
                onExport={() => {}}
                onGenerateVideo={() => setCredits((c) => Math.max(0, c - 5))}
              />
            )}
          </div>
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
    </div>
  );
};

export default Index;
