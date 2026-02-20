import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VideoJobTracker } from '@/components/VideoProgressPanel';

interface VideoPollingContextType {
  videoJobs: VideoJobTracker[];
  addJob: (job: VideoJobTracker, taskId: string) => void;
  dismissJob: (id: string) => void;
}

const VideoPollingContext = createContext<VideoPollingContextType | undefined>(undefined);

export function VideoPollingProvider({ children }: { children: ReactNode }) {
  const [videoJobs, setVideoJobs] = useState<VideoJobTracker[]>([]);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const addJob = useCallback((job: VideoJobTracker, taskId: string) => {
    setVideoJobs(prev => [job, ...prev]);

    pollRefs.current[job.id] = setInterval(async () => {
      try {
        const { data: pollData } = await supabase.functions.invoke('generate-video', {
          body: { action: 'poll', taskId },
        });
        if (pollData?.status === 'SUCCESS' && pollData?.videoUrl) {
          clearInterval(pollRefs.current[job.id]);
          delete pollRefs.current[job.id];
          await supabase.from('video_jobs').update({
            status: 'success', video_url: pollData.videoUrl, thumbnail_url: pollData.coverUrl || null,
          }).eq('id', job.id);
          setVideoJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success', videoUrl: pollData.videoUrl } : j));
          toast.success('视频生成完成！');
        } else if (pollData?.status === 'FAIL') {
          clearInterval(pollRefs.current[job.id]);
          delete pollRefs.current[job.id];
          await supabase.from('video_jobs').update({ status: 'failed' }).eq('id', job.id);
          setVideoJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed' } : j));
          toast.error('视频生成失败');
        }
      } catch { /* ignore */ }
    }, 10000);
  }, []);

  const dismissJob = useCallback((id: string) => {
    setVideoJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  // Resume polling for processing jobs on mount
  useEffect(() => {
    const resumePolling = async () => {
      const { data } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        data.forEach((row: any) => {
          if (row.task_id && !pollRefs.current[row.id]) {
            const job: VideoJobTracker = {
              id: row.id,
              taskId: row.task_id,
              prompt: row.prompt,
              status: 'processing',
              startedAt: new Date(row.created_at).getTime(),
            };
            addJob(job, row.task_id);
          }
        });
      }
    };
    resumePolling();
    return () => { Object.values(pollRefs.current).forEach(clearInterval); };
  }, [addJob]);

  // Tick for elapsed time display
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasProcessing = videoJobs.some(j => j.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [videoJobs]);

  return (
    <VideoPollingContext.Provider value={{ videoJobs, addJob, dismissJob }}>
      {children}
    </VideoPollingContext.Provider>
  );
}

export function useVideoPolling() {
  const context = useContext(VideoPollingContext);
  if (!context) throw new Error('useVideoPolling must be used within VideoPollingProvider');
  return context;
}
