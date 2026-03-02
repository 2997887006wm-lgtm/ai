import { useState, useRef, useEffect } from 'react';
import { Sparkles, Square, Pencil, Paperclip, Image, Camera, Mic, MicOff, Wand2, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';
import { CameraCapture } from './CameraCapture';
import { ScriptTemplates } from './ScriptTemplates';
import { supabase } from '@/integrations/supabase/client';
import type { Shot } from './StoryboardCard';
const MOODS = [
  { id: 'healing', label: '治愈', emoji: '🌿' },
  { id: 'funny', label: '搞笑', emoji: '😄' },
  { id: 'suspense', label: '悬疑', emoji: '🔍' },
  { id: 'passionate', label: '热血', emoji: '🔥' },
  { id: 'literary', label: '文艺', emoji: '📖' },
  { id: 'horror', label: '恐怖', emoji: '👻' },
  { id: 'romantic', label: '浪漫', emoji: '💕' },
  { id: 'epic', label: '史诗', emoji: '⚔️' },
];

interface InspirationInputProps {
  onGenerate: (inspiration: string, duration: 'short' | 'long', mood: string, skipRag?: boolean) => void;
  onCancel?: () => void;
  isGenerating: boolean;
  onLoadShots?: (shots: Shot[], title: string, duration: 'short' | 'long', mood: string) => void;
  initialInspiration?: string;
}

export function InspirationInput({ onGenerate, onCancel, isGenerating, onLoadShots, initialInspiration = '' }: InspirationInputProps) {
  const [inspiration, setInspiration] = useState(initialInspiration);
  const [duration, setDuration] = useState<'short' | 'long'>('short');
  const [mood, setMood] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [highContrast, setHighContrast] = useState(false);
  const [fastMode, setFastMode] = useState(false); // 快速模式：跳过知识库检索
  const [isPolishing, setIsPolishing] = useState(false);

  const handlePolishPrompt = async () => {
    if (!inspiration.trim()) return;
    playClick();
    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-prompt', {
        body: { prompt: inspiration },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.polished) {
        setInspiration(data.polished);
        toast.success('提示词已润色');
      }
    } catch (e: any) {
      console.error('Polish error:', e);
      toast.error('润色失败，请重试');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUseTemplate = (templateInspiration: string, templateDuration: 'short' | 'long', templateMood: string) => {
    setInspiration(templateInspiration);
    setDuration(templateDuration);
    setMood(templateMood);
    toast.success('已加载脚本模版，可编辑后生成');
  };

  const handleGenerate = () => {
    if (!inspiration.trim()) return;
    playClick();
    onGenerate(inspiration, duration, mood, fastMode);
  };

  const handleCancel = () => {
    playClick();
    onCancel?.();
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5);
    setAttachments(prev => [...prev, ...newFiles].slice(0, 5));
    toast.success(`已添加 ${newFiles.length} 个文件作为参考素材`);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = (file: File) => {
    setAttachments(prev => [...prev, file].slice(0, 5));
    toast.success('已拍摄照片作为参考素材');
  };

  const handleCameraClick = () => {
    playClick();
    setShowCamera(true);
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('您的浏览器不支持语音输入，请使用 Chrome 或 Edge');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = inspiration;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInspiration(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('语音识别出错，请重试');
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    playClick();
  };

  useEffect(() => {
    if (initialInspiration && !inspiration) {
      setInspiration(initialInspiration);
    }
  }, [initialInspiration]);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  return (
    <div className={`w-full max-w-3xl mx-auto animate-fade-in ${highContrast ? 'high-contrast-mode' : ''}`}>
      <div className="flex flex-col gap-6">
        {/* Main input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inspiration}
            onChange={(e) => setInspiration(e.target.value)}
            placeholder="在此输入您的核心灵感..."
            className="w-full bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-muted-foreground/40 font-serif-cn min-h-[120px] px-1 py-2"
            rows={4}
            disabled={isGenerating}
            aria-label="核心灵感描述"
            aria-describedby="inspiration-help"
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span id="inspiration-help" className="sr-only">请输入您的创作灵感，AI将基于此生成完整分镜脚本</span>
          <div className="flex justify-end mt-1 pr-1">
            <span className="text-[11px] text-muted-foreground/40 tabular-nums">{inspiration.length} 字</span>
          </div>
        </div>

        {/* Attachment toolbar */}
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
          <input ref={imageInputRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />

          <button
            onClick={() => { playClick(); fileInputRef.current?.click(); }}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all duration-300 disabled:opacity-40"
            title="添加本地文件"
            aria-label="添加本地文件作为参考素材"
          >
            <Paperclip size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">文件</span>
          </button>

          <button
            onClick={() => { playClick(); imageInputRef.current?.click(); }}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all duration-300 disabled:opacity-40"
            title="从图库选择照片"
            aria-label="从图库选择参考照片"
          >
            <Image size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">照片</span>
          </button>

          <button
            onClick={handleCameraClick}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all duration-300 disabled:opacity-40"
            title="使用相机拍摄"
            aria-label="使用相机拍摄参考照片"
          >
            <Camera size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">相机</span>
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <ScriptTemplates onUseTemplate={handleUseTemplate} onLoadShots={onLoadShots} />

          <button
            onClick={handlePolishPrompt}
            disabled={isGenerating || isPolishing || !inspiration.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-40"
            title="AI 润色提示词"
          >
            {isPolishing ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" /> : <Wand2 size={13} strokeWidth={1.5} />}
            <span className="hidden sm:inline">AI润色</span>
          </button>

          <button
            onClick={toggleVoiceInput}
            disabled={isGenerating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-300 disabled:opacity-40 ${
              isListening
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50'
            }`}
            title={isListening ? '停止语音输入' : '语音输入'}
            aria-label={isListening ? '停止语音输入' : '开始语音输入'}
            aria-pressed={isListening}
          >
            {isListening ? (
              <>
                <MicOff size={13} strokeWidth={1.5} />
                <span className="hidden sm:inline">停止</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </>
            ) : (
              <>
                <Mic size={13} strokeWidth={1.5} />
                <span className="hidden sm:inline">语音</span>
              </>
            )}
          </button>
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2" role="list" aria-label="已添加的参考素材">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/60 text-xs text-foreground/70 border border-border/50"
                role="listitem"
              >
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="" className="w-4 h-4 rounded object-cover" />
                ) : (
                  <Paperclip size={10} strokeWidth={1.5} />
                )}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors ml-0.5"
                  aria-label={`移除文件 ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mood selector */}
        <div>
          <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-widest font-medium">情绪风格</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="选择情绪风格">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMood(mood === m.id ? '' : m.id); playClick(); }}
                disabled={isGenerating}
                role="radio"
                aria-checked={mood === m.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all duration-300 ${
                  mood === m.id
                    ? 'border-foreground bg-foreground text-background shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span aria-hidden="true">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
          <div className="capsule-toggle" role="radiogroup" aria-label="视频时长选择">
            <button
              onClick={() => { setDuration('short'); playClick(); }}
              disabled={isGenerating}
              role="radio"
              aria-checked={duration === 'short'}
              className={`capsule-option ${duration === 'short' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              轻巧短片 (&lt;60s)
            </button>
            <button
              onClick={() => { setDuration('long'); playClick(); }}
              disabled={isGenerating}
              role="radio"
              aria-checked={duration === 'long'}
              className={`capsule-option ${duration === 'long' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              深度长片
            </button>
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none" title="跳过知识库检索，加快生成速度">
            <input
              type="checkbox"
              checked={fastMode}
              onChange={() => { setFastMode(!fastMode); playClick(); }}
              disabled={isGenerating}
              className="rounded border-border"
            />
            快速模式
          </label>
          </div>

          <div className="flex items-center gap-2">
            {isGenerating ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  <div className="flex gap-1" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs">灵感酝酿中</span>
                </div>

                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-destructive/30 text-destructive text-sm font-medium transition-all duration-300 hover:bg-destructive/10 hover:border-destructive/50"
                  aria-label="停止生成脚本"
                >
                  <Square size={12} strokeWidth={2} fill="currentColor" />
                  停止
                </button>

                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm text-foreground font-medium transition-all duration-300 hover:bg-secondary"
                  aria-label="停止并重新编辑灵感"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                  重新编辑
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!inspiration.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-medium transition-all duration-300 hover:shadow-elevated disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="使用AI生成分镜脚本"
              >
                <Sparkles size={14} strokeWidth={1.5} />
                生成脚本
              </button>
            )}
          </div>
        </div>

        {/* Accessibility toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => { setHighContrast(!highContrast); playClick(); }}
            className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors px-2 py-1 rounded"
            title="切换高对比度显示"
            aria-label={highContrast ? '关闭高对比度模式' : '开启高对比度模式'}
          >
            {highContrast ? '● 标准显示' : '◐ 高对比度'}
          </button>
        </div>
      </div>

      {/* Camera capture modal */}
      <CameraCapture
        visible={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    </div>
  );
}
