import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VideoJobTracker } from '@/components/VideoProgressPanel';

interface BatchInfo {
  jobIds: string[];
  completedIds: Set<string>;
}

interface VideoPollingContextType {
  videoJobs: VideoJobTracker[];
  addJob: (job: VideoJobTracker, taskId: string) => void;
  dismissJob: (id: string) => void;
  startBatch: (jobIds: string[]) => void;
  onBatchComplete: React.MutableRefObject<((jobs: VideoJobTracker[]) => void) | null>;
}

const VideoPollingContext = createContext<VideoPollingContextType | undefined>(undefined);

export function VideoPollingProvider({ children }: { children: ReactNode }) {
  const [videoJobs, setVideoJobs] = useState<VideoJobTracker[]>([]);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const batchRef = useRef<BatchInfo | null>(null);
  const onBatchComplete = useRef<((jobs: VideoJobTracker[]) => void) | null>(null);

  const checkBatchCompletion = useCallback((jobs: VideoJobTracker[]) => {
    const batch = batchRef.current;
    if (!batch) return;
    const done = batch.jobIds.every(id => {
      const job = jobs.find(j => j.id === id);
      return job && (job.status === 'success' || job.status === 'failed');
    });
    if (done) {
      const batchJobs = batch.jobIds
        .map(id => jobs.find(j => j.id === id)!)
        .filter(j => j.status === 'success' && j.videoUrl);
      batchRef.current = null;
      if (batchJobs.length > 0 && onBatchComplete.current) {
        onBatchComplete.current(batchJobs);
      }
    }
  }, []);

  const addJob = useCallback((job: VideoJobTracker, taskId: string) => {
    setVideoJobs(prev => {
      const next = [job, ...prev];
      return next;
    });

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
          setVideoJobs(prev => {
            const next = prev.map(j => j.id === job.id ? { ...j, status: 'success' as const, videoUrl: pollData.videoUrl } : j);
            setTimeout(() => checkBatchCompletion(next), 0);
            return next;
          });
          toast.success('视频生成完成！');
        } else if (pollData?.status === 'FAIL') {
          clearInterval(pollRefs.current[job.id]);
          delete pollRefs.current[job.id];
          await supabase.from('video_jobs').update({ status: 'failed' }).eq('id', job.id);
          setVideoJobs(prev => {
            const next = prev.map(j => j.id === job.id ? { ...j, status: 'failed' as const } : j);
            setTimeout(() => checkBatchCompletion(next), 0);
            return next;
          });
          toast.error('视频生成失败');
        }
      } catch { /* ignore */ }
    }, 10000);
  }, [checkBatchCompletion]);

  const dismissJob = useCallback((id: string) => {
    setVideoJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const startBatch = useCallback((jobIds: string[]) => {
    batchRef.current = { jobIds, completedIds: new Set() };
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
    <VideoPollingContext.Provider value={{ videoJobs, addJob, dismissJob, startBatch, onBatchComplete }}>
      {children}
    </VideoPollingContext.Provider>
  );
}

export function useVideoPolling() {
  const context = useContext(VideoPollingContext);
  if (!context) throw new Error('useVideoPolling must be used within VideoPollingProvider');
  return context;
}
