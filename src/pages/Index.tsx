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
import { VideoLibraryPanel } from '@/components/VideoLibraryPanel';
import { Music } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { useAuth } from '@/hooks/useAuth';
import { useVideoPolling } from '@/hooks/useVideoPolling';
import type { Shot } from '@/components/StoryboardCard';

let nextShotId = 100;

const CN_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const MOCK_SHORT_SHOTS: Shot[] = [
  { id: 1, shotNumber: '01', shotType: '大远景', visual: '晨雾弥漫的山谷，一条蜿蜒小路隐入远方的松林', duration: '8s', dialogue: '', audio: '远处鸟鸣，风穿过松针的沙沙声', character: '', directorNote: '以缓慢推进开场，建立孤独而宁静的情绪基底', emotionIntensity: 25 },
  { id: 2, shotNumber: '02', shotType: '中景', visual: '一双旧布鞋踩过露湿的碎石路，步伐从容', duration: '5s', dialogue: '', audio: '碎石轻响，布料摩擦', character: '行者 — 年约四十，面容平静', directorNote: '不露面容，仅以脚步暗示人物性格', emotionIntensity: 35 },
  { id: 3, shotNumber: '03', shotType: '特写', visual: '手指轻触路旁一株野花，露珠滑落', duration: '4s', dialogue: '（旁白）有些路，走过便是全部的意义。', audio: '水滴落入溪面的轻微声响', character: '', directorNote: '这是情感锚点，画面节奏在此凝滞片刻', emotionIntensity: 70 },
  { id: 4, shotNumber: '04', shotType: '远景', visual: '行者的背影渐行渐远，阳光从云层缝隙倾泻而下', duration: '6s', dialogue: '', audio: '弦乐缓缓渐入，如叹息般温柔', character: '', directorNote: '自然光是最好的演员。等待真实的丁达尔光线', emotionIntensity: 55 },
];

function renumberTree(node: TreeNode): TreeNode {
  if (!node.children) return node;
  const children = node.children.map((child, i) => {
    const num = CN_NUMBERS[i] || String(i + 1);
    let newLabel = child.label;
    const actMatch = child.label.match(/^第.+?幕\s*·?\s*(.*)/);
    const sceneMatch = child.label.match(/^场景.+?\s*·?\s*(.*)/);
    if (actMatch) newLabel = `第${num}幕 · ${actMatch[1]}`;
    else if (sceneMatch) newLabel = `场景${num} · ${sceneMatch[1]}`;
    return renumberTree({ ...child, label: newLabel });
  });
  return { ...node, children };
}

function getLeafIds(node: TreeNode): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  return node.children.flatMap(getLeafIds);
}

function getFirstLeafId(node: TreeNode): string | null {
  if (!node.children || node.children.length === 0) return node.id;
  return getFirstLeafId(node.children[0]);
}

type Phase = 'input' | 'style' | 'storyboard';

const Index = () => {
  const { user } = useAuth();
  const { videoJobs, addJob } = useVideoPolling();
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'videos'>('new');
  const [phase, setPhase] = useState<Phase>('input');
  const [credits, setCredits] = useState(15);
  const [showCredits, setShowCredits] = useState(false);
  const [showAudioLib, setShowAudioLib] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationType, setDurationType] = useState<'short' | 'long'>('short');
  const [shots, setShots] = useState<Shot[]>(MOCK_SHORT_SHOTS);
  const [scriptTitle, setScriptTitle] = useState('');
  const [activeTreeNode, setActiveTreeNode] = useState<string | null>(null);
  const [scriptTree, setScriptTree] = useState<TreeNode>({ id: 'root', label: '总纲', children: [] });
  const [sceneShotsMap, setSceneShotsMap] = useState<Record<string, Shot[]>>({});
  const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
  const [inspiration, setInspiration] = useState('');
  const [currentMood, setCurrentMood] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Sync shots from sceneShotsMap when activeTreeNode changes (smooth transition)
  useEffect(() => {
    if (durationType === 'long' && activeTreeNode && sceneShotsMap[activeTreeNode]) {
      setShots(sceneShotsMap[activeTreeNode]);
    }
  }, [activeTreeNode, durationType, sceneShotsMap]);

  const syncShotsToMap = useCallback((updatedShots: Shot[]) => {
    if (durationType === 'long' && activeTreeNode) {
      setSceneShotsMap(prev => ({ ...prev, [activeTreeNode]: updatedShots }));
    }
  }, [durationType, activeTreeNode]);

  // Auto-save script to DB
  const saveScript = useCallback(async (
    id: string | null,
    data: {
      title: string;
      inspiration: string;
      mood: string;
      durationType: string;
      shots: Shot[];
      scriptTree: TreeNode;
      sceneShotsMap: Record<string, Shot[]>;
    }
  ) => {
    try {
      const row = {
        title: data.title,
        inspiration: data.inspiration,
        mood: data.mood,
        duration_type: data.durationType,
        shots: JSON.parse(JSON.stringify(data.shots)),
        script_tree: data.durationType === 'long' ? JSON.parse(JSON.stringify(data.scriptTree)) : null,
        scene_shots_map: data.durationType === 'long' ? JSON.parse(JSON.stringify(data.sceneShotsMap)) : null,
        user_id: user?.id || null,
      };

      if (id) {
        await supabase.from('scripts').update(row).eq('id', id);
        return id;
      } else {
        const { data: inserted } = await supabase.from('scripts').insert(row).select('id').single();
        return inserted?.id || null;
      }
    } catch (e) {
      console.error('Save script error:', e);
      return id;
    }
  }, [user]);

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (phase !== 'storyboard') return;
      const allShots = durationType === 'long' ? Object.values(sceneShotsMap).flat() : shots;
      const title = scriptTitle || allShots[0]?.visual?.slice(0, 30) || '未命名脚本';
      const newId = await saveScript(currentScriptId, {
        title,
        inspiration,
        mood: currentMood,
        durationType,
        shots: durationType === 'short' ? shots : [],
        scriptTree,
        sceneShotsMap,
      });
      if (newId && !currentScriptId) setCurrentScriptId(newId);
    }, 3000);
  }, [phase, durationType, shots, sceneShotsMap, scriptTree, currentScriptId, inspiration, currentMood, saveScript]);

  useEffect(() => {
    if (phase === 'storyboard') autoSave();
  }, [shots, sceneShotsMap, phase, autoSave]);

  const handleCancelGenerate = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
    toast.info('已停止生成，您可以修改指令后重新生成');
  }, []);

  // Auto-generate dialogue suggestions for shots
  const generateDialogueSuggestions = useCallback(async (parsedShots: Shot[]) => {
    // Generate dialogue for shots that don't have dialogue but have visuals
    const shotsNeedingDialogue = parsedShots.filter(s => !s.dialogue && s.visual);
    if (shotsNeedingDialogue.length === 0) return;

    // Generate in parallel (max 3 at a time)
    const batch = shotsNeedingDialogue.slice(0, 3);
    const promises = batch.map(async (shot) => {
      try {
        const { data } = await supabase.functions.invoke('generate-dialogue', {
          body: {
            visual: shot.visual,
            shotType: shot.shotType,
            character: shot.character,
            duration: shot.duration,
            mode: shot.character ? 'dialogue' : 'narration',
          },
        });
        if (data?.text) {
          return { id: shot.id, dialogue: data.text };
        }
      } catch { /* ignore */ }
      return null;
    });

    const results = await Promise.all(promises);
    const updates = results.filter(Boolean) as { id: number; dialogue: string }[];

    if (updates.length > 0) {
      setShots(prev => prev.map(s => {
        const update = updates.find(u => u.id === s.id);
        // Only set as suggestion, user can accept/modify
        return update ? { ...s, dialogueSuggestion: update.dialogue } : s;
      }));
      toast.info(`已为 ${updates.length} 个分镜生成台词建议`);
    }
  }, []);

  const handleGenerate = useCallback(async (insp: string, duration: 'short' | 'long', mood: string) => {
    setDurationType(duration);
    setIsGenerating(true);
    setInspiration(insp);
    setCurrentMood(mood);
    setCurrentScriptId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { inspiration: insp, duration, mood },
      });

      if (controller.signal.aborted) return;
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.ragUsed) {
        toast.info('已参考经典电影分镜手法与自然常识知识库');
      }

      if (duration === 'long') {
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
              emotionIntensity: typeof s.emotionIntensity === 'number' ? s.emotionIntensity : 50,
            }));
          }
          setSceneShotsMap(parsedMap);
          const firstLeaf = getFirstLeafId(data.tree);
          setActiveTreeNode(firstLeaf);
          if (firstLeaf && parsedMap[firstLeaf]) {
            setShots(parsedMap[firstLeaf]);
            // Auto-generate dialogue for first scene
            generateDialogueSuggestions(parsedMap[firstLeaf]);
          }
        }
      } else {
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
            emotionIntensity: typeof s.emotionIntensity === 'number' ? s.emotionIntensity : 50,
          }));
          setShots(parsed);
          // Auto-generate dialogue suggestions
          generateDialogueSuggestions(parsed);
        }
      }
      setPhase('style');
    } catch (e: any) {
      if (e.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Script generation error:', e);
      toast.error(e.message || '脚本生成失败，请重试');
    } finally {
      if (!controller.signal.aborted) setIsGenerating(false);
      abortRef.current = null;
    }
  }, [generateDialogueSuggestions]);

  const handleStyleSelect = useCallback((_styleId: string) => {
    setPhase('storyboard');
  }, []);

  const handleUpdateShot = useCallback((id: number, field: keyof Shot, value: string) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (durationType === 'long' && activeTreeNode) {
      setSceneShotsMap(prev => {
        const current = prev[activeTreeNode] || [];
        return { ...prev, [activeTreeNode]: current.map(s => s.id === id ? { ...s, [field]: value } : s) };
      });
    }
  }, [durationType, activeTreeNode]);

  const handleReorderShots = useCallback((activeId: number, overId: number) => {
    setShots(prev => {
      const oldIndex = prev.findIndex(s => s.id === activeId);
      const newIndex = prev.findIndex(s => s.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
    });
  }, []);

  const handleDeleteShot = useCallback((id: number) => {
    setShots(prev => {
      const next = prev.filter(s => s.id !== id);
      return next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
    });
  }, []);

  const handleInsertShot = useCallback((afterId: number) => {
    setShots(prev => {
      const idx = prev.findIndex(s => s.id === afterId);
      if (idx === -1) return prev;
      const newShot: Shot = {
        id: nextShotId++, shotNumber: '', shotType: '中景', visual: '',
        duration: '5s', dialogue: '', audio: '', character: '', directorNote: '',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newShot);
      return next.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') }));
    });
  }, []);

  const handleAddShot = useCallback(() => {
    setShots(prev => {
      const newShot: Shot = {
        id: nextShotId++, shotNumber: String(prev.length + 1).padStart(2, '0'),
        shotType: '中景', visual: '', duration: '5s', dialogue: '', audio: '',
        character: '', directorNote: '',
      };
      return [...prev, newShot];
    });
  }, []);

  useEffect(() => {
    if (durationType === 'long' && activeTreeNode) syncShotsToMap(shots);
  }, [shots, durationType, activeTreeNode, syncShotsToMap]);

  const handleTreeNodeSelect = useCallback((id: string) => {
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
      if (node.children) return { ...node, children: node.children.map(reorderChildren) };
      return node;
    };
    setScriptTree(prev => renumberTree(reorderChildren(prev)));
  }, []);

  // Load script from history
  const handleLoadScript = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return;

      setCurrentScriptId(id);
      setScriptTitle(data.title || '');
      setInspiration(data.inspiration || '');
      setCurrentMood(data.mood || '');
      setDurationType(data.duration_type as 'short' | 'long');

      if (data.duration_type === 'long' && data.script_tree && data.scene_shots_map) {
        const tree = data.script_tree as unknown as TreeNode;
        const map = data.scene_shots_map as unknown as Record<string, Shot[]>;
        // Re-assign IDs to avoid conflicts
        const parsedMap: Record<string, Shot[]> = {};
        for (const [sceneId, rawShots] of Object.entries(map)) {
          parsedMap[sceneId] = (rawShots as any[]).map((s: any, i: number) => ({
            ...s,
            id: nextShotId++,
            shotNumber: String(i + 1).padStart(2, '0'),
          }));
        }
        setScriptTree(tree);
        setSceneShotsMap(parsedMap);
        const firstLeaf = getFirstLeafId(tree);
        setActiveTreeNode(firstLeaf);
        if (firstLeaf && parsedMap[firstLeaf]) setShots(parsedMap[firstLeaf]);
      } else {
        const rawShots = (data.shots as any[]) || [];
        setShots(rawShots.map((s: any, i: number) => ({
          ...s,
          id: nextShotId++,
          shotNumber: String(i + 1).padStart(2, '0'),
        })));
        setScriptTree({ id: 'root', label: '总纲', children: [] });
        setSceneShotsMap({});
        setActiveTreeNode(null);
      }

      setPhase('storyboard');
      setActiveTab('new');
      toast.success('脚本已加载');
    } catch (e) {
      console.error('Load script error:', e);
      toast.error('加载脚本失败');
    }
  }, []);

  // Video generation (single combined prompt)
  const handleGenerateVideo = useCallback(async (ratio?: string) => {
    const processingJobs = videoJobs.filter(j => j.status === 'processing');
    if (processingJobs.length >= 3) {
      toast.warning('最多同时生成3个视频，请等待完成');
      return;
    }

    const allShots = durationType === 'long' ? Object.values(sceneShotsMap).flat() : shots;
    const prompt = allShots.map((s, i) =>
      `镜头${i + 1}(${s.shotType}): ${s.visual}${s.dialogue ? ` 台词：${s.dialogue}` : ''}`
    ).join('；') + (ratio ? ` [画面比例: ${ratio}]` : '');

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { action: 'submit', prompt },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const taskId = data?.taskId;
      if (!taskId) throw new Error('未获取到视频任务ID');

      const dbRow = {
        task_id: taskId,
        prompt: prompt.slice(0, 2000),
        status: 'processing',
        title: scriptTitle || allShots[0]?.visual?.slice(0, 60) || '视频项目',
        user_id: user?.id || null,
      };
      const { data: inserted } = await supabase.from('video_jobs').insert(dbRow).select('id').single();
      const jobDbId = inserted?.id || taskId;

      addJob({ id: jobDbId, taskId, prompt, status: 'processing', startedAt: Date.now() }, taskId);
      toast.info('视频生成任务已提交，预计需要2-5分钟');
      setCredits(c => Math.max(0, c - 5));
    } catch (e: any) {
      console.error('Video generation error:', e);
      toast.error(e.message || '视频生成失败');
    }
  }, [shots, sceneShotsMap, durationType, videoJobs, user, addJob, scriptTitle]);

  // Per-shot video generation (each shot gets its own optimized prompt)
  const handleGenerateVideoPerShot = useCallback(async (ratio?: string) => {
    const allShots = durationType === 'long' ? Object.values(sceneShotsMap).flat() : shots;
    const processingJobs = videoJobs.filter(j => j.status === 'processing');
    if (processingJobs.length + allShots.length > 10) {
      toast.warning(`逐镜生成将提交${allShots.length}个任务，当前队列已满，请等待部分完成`);
      return;
    }

    toast.info(`开始逐镜生成 ${allShots.length} 个视频片段…`);
    let submitted = 0;

    for (const [i, shot] of allShots.entries()) {
      // Build per-shot cinematic prompt
      const shotPrompt = [
        `景别: ${shot.shotType}`,
        `画面: ${shot.visual}`,
        shot.dialogue ? `台词: ${shot.dialogue}` : '',
        shot.directorNote ? `导演指示: ${shot.directorNote}` : '',
        shot.audio ? `音效氛围: ${shot.audio}` : '',
        `时长: ${shot.duration}`,
        ratio ? `画面比例: ${ratio}` : '',
      ].filter(Boolean).join('。');

      try {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { action: 'submit', prompt: shotPrompt },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        const taskId = data?.taskId;
        if (!taskId) continue;

        const dbRow = {
          task_id: taskId,
          prompt: shotPrompt.slice(0, 2000),
          status: 'processing',
          title: `镜头${i + 1} · ${shot.shotType} · ${shot.visual.slice(0, 30)}`,
          user_id: user?.id || null,
        };
        const { data: inserted } = await supabase.from('video_jobs').insert(dbRow).select('id').single();
        const jobDbId = inserted?.id || taskId;

        addJob({ id: jobDbId, taskId, prompt: shotPrompt, status: 'processing', startedAt: Date.now() }, taskId);
        submitted++;
      } catch (e: any) {
        console.error(`Shot ${i + 1} video error:`, e);
        toast.error(`镜头${i + 1}提交失败: ${e.message}`);
      }
    }

    if (submitted > 0) {
      toast.success(`已提交 ${submitted}/${allShots.length} 个镜头的视频生成任务`);
      setCredits(c => Math.max(0, c - submitted * 5));
    }
  }, [shots, sceneShotsMap, durationType, videoJobs, user, addJob]);

  const handleNewProject = () => {
    setActiveTab('new');
    setPhase('input');
    setShots(MOCK_SHORT_SHOTS);
    setScriptTitle('');
    setScriptTree({ id: 'root', label: '总纲', children: [] });
    setSceneShotsMap({});
    setActiveTreeNode(null);
    setCurrentScriptId(null);
  };

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
            <HistoryPanel onLoadScript={handleLoadScript} />
          </div>
        ) : activeTab === 'videos' ? (
          <div className="px-12 py-16">
            <h1 className="text-2xl font-serif-cn font-medium text-foreground mb-2">视频库</h1>
            <p className="text-sm text-muted-foreground mb-8">在这里查看所有已生成的视频</p>
            <VideoLibraryPanel />
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
              <InspirationInput
                onGenerate={handleGenerate}
                onCancel={handleCancelGenerate}
                isGenerating={isGenerating}
              />
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
                <div className="flex-1 animate-slide-in-right" key={activeTreeNode}>
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
                    onGenerateVideoPerShot={handleGenerateVideoPerShot}
                    title={scriptTitle}
                    onTitleChange={setScriptTitle}
                    inspiration={inspiration}
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
                onGenerateVideoPerShot={handleGenerateVideoPerShot}
                title={scriptTitle}
                onTitleChange={setScriptTitle}
                inspiration={inspiration}
              />
            )}
          </div>
        )}

        {/* Floating audio lib button */}
        {phase === 'storyboard' && activeTab === 'new' && (
          <button
            onClick={() => { playClick(); setShowAudioLib(true); }}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-scarlet hover:shadow-elevated transition-all duration-500 z-40"
            title="音效与音乐库"
          >
            <Music size={18} strokeWidth={1.5} />
          </button>
        )}
      </main>

      {/* VideoProgressPanel is now rendered globally in App.tsx */}

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
        scriptTree={scriptTree}
        sceneShotsMap={sceneShotsMap}
        durationType={durationType}
      />
    </div>
  );
};

export default Index;
