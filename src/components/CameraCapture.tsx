import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  visible: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ visible, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState('');

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError('');
    } catch {
      setError('无法访问摄像头，请检查权限设置');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      startCamera(facingMode);
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [visible, facingMode, startCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  }, [onCapture, onClose]);

  const toggleFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden bg-card border border-border shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-serif-cn text-foreground">摄像头捕捉</h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-center gap-4 px-4 py-4">
          <button
            onClick={toggleFacing}
            className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="切换前后摄像头"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleCapture}
            disabled={!!error}
            className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40"
            title="拍照"
          >
            <Camera size={20} />
          </button>
          <div className="w-10" /> {/* spacer */}
        </div>
      </div>
    </div>
  );
}
