import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Shot } from './StoryboardCard';

interface EmotionCurveChartProps {
  shots: Shot[];
}

const EMOTION_LABELS: Record<string, string> = {
  '0': '沉寂',
  '20': '低沉',
  '40': '铺垫',
  '60': '渐升',
  '80': '紧张',
  '100': '高潮',
};

function getEmotionLabel(value: number): string {
  if (value <= 10) return '沉寂';
  if (value <= 30) return '低沉';
  if (value <= 50) return '铺垫';
  if (value <= 70) return '渐升';
  if (value <= 85) return '紧张';
  return '高潮';
}

export function EmotionCurveChart({ shots }: EmotionCurveChartProps) {
  const data = useMemo(() =>
    shots.map((s, i) => ({
      name: `#${s.shotNumber}`,
      intensity: s.emotionIntensity ?? 50,
      shotType: s.shotType,
      label: getEmotionLabel(s.emotionIntensity ?? 50),
    })),
    [shots]
  );

  if (shots.length < 2) return null;

  return (
    <div className="w-full mb-8 animate-fade-in" role="img" aria-label="情绪曲线图：展示分镜情节起伏">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">
          情绪曲线
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
          <span>沉寂</span>
          <div className="w-16 h-px bg-gradient-to-r from-muted-foreground/10 via-primary/40 to-primary/70" />
          <span>高潮</span>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-4" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -20 }}>
            <defs>
              <linearGradient id="emotionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(350, 65%, 52%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(350, 65%, 52%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 10%, 88%)"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'hsl(220, 8%, 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'hsl(220, 8%, 55%)' }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg bg-card border border-border shadow-card px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">{d.name} · {d.shotType}</p>
                    <p className="text-muted-foreground mt-0.5">
                      情绪：<span className="text-primary font-medium">{d.label}</span>
                      <span className="ml-1 text-muted-foreground/50">({d.intensity})</span>
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="intensity"
              stroke="hsl(350, 65%, 52%)"
              strokeWidth={2}
              fill="url(#emotionGradient)"
              dot={{ r: 3, fill: 'hsl(350, 65%, 52%)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'hsl(350, 65%, 52%)', stroke: 'hsl(40, 20%, 97%)', strokeWidth: 2 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
