import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PresenceUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  cursor_position: { shotId?: string; field?: string };
  color: string;
}

const CURSOR_COLORS = [
  'hsl(340, 80%, 55%)', 'hsl(210, 80%, 55%)', 'hsl(130, 60%, 45%)',
  'hsl(45, 90%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(15, 85%, 55%)',
];

interface CollaborationPresenceProps {
  scriptId: string | null;
  currentShotId?: string;
  currentField?: string;
}

export function CollaborationPresence({ scriptId, currentShotId, currentField }: CollaborationPresenceProps) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update own presence
  const updatePresence = useCallback(async () => {
    if (!scriptId || !user) return;
    try {
      await supabase.from('script_presence').upsert({
        script_id: scriptId,
        user_id: user.id,
        cursor_position: { shotId: currentShotId, field: currentField },
        last_seen: new Date().toISOString(),
      }, { onConflict: 'script_id,user_id' });
    } catch (e) {
      // Silently fail
    }
  }, [scriptId, user, currentShotId, currentField]);

  // Fetch active users
  const fetchPresence = useCallback(async () => {
    if (!scriptId || !user) return;
    try {
      const threshold = new Date(Date.now() - 30000).toISOString(); // 30s ago
      const { data } = await supabase
        .from('script_presence')
        .select('*')
        .eq('script_id', scriptId)
        .gte('last_seen', threshold)
        .neq('user_id', user.id);

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setActiveUsers(data.map((d, i) => ({
          user_id: d.user_id,
          display_name: profileMap.get(d.user_id)?.display_name || '协作者',
          avatar_url: profileMap.get(d.user_id)?.avatar_url || null,
          cursor_position: (d.cursor_position as any) || {},
          color: CURSOR_COLORS[i % CURSOR_COLORS.length],
        })));
      } else {
        setActiveUsers([]);
      }
    } catch (e) {
      // Silently fail
    }
  }, [scriptId, user]);

  useEffect(() => {
    if (!scriptId || !user) return;

    // Initial update
    updatePresence();
    fetchPresence();

    // Heartbeat every 10s
    updateTimerRef.current = setInterval(() => {
      updatePresence();
      fetchPresence();
    }, 10000);

    // Real-time subscription for instant cursor updates
    const channel = supabase
      .channel(`presence-${scriptId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'script_presence',
        filter: `script_id=eq.${scriptId}`,
      }, () => {
        fetchPresence();
      })
      .subscribe();

    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
      supabase.removeChannel(channel);
      // Clean up presence on unmount
      supabase.from('script_presence').delete()
        .eq('script_id', scriptId)
        .eq('user_id', user.id)
        .then(() => {});
    };
  }, [scriptId, user, updatePresence, fetchPresence]);

  // Update presence when cursor moves
  useEffect(() => {
    updatePresence();
  }, [currentShotId, currentField, updatePresence]);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1.5">
        {activeUsers.slice(0, 5).map(u => (
          <div
            key={u.user_id}
            className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center shrink-0"
            style={{ backgroundColor: u.color }}
            title={`${u.display_name}${u.cursor_position.shotId ? ` · 镜头 ${u.cursor_position.shotId}` : ''}`}
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="text-[8px] font-bold text-white">
                {u.display_name[0].toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground ml-1">
        {activeUsers.length}人在线
      </span>
    </div>
  );
}

// Cursor indicator overlay for a specific shot
export function CursorIndicator({ shotId, activeUsers }: { shotId: string; activeUsers: PresenceUser[] }) {
  const usersOnShot = activeUsers.filter(u => u.cursor_position?.shotId === shotId);
  if (usersOnShot.length === 0) return null;

  return (
    <div className="absolute -left-2 top-0 flex flex-col gap-0.5">
      {usersOnShot.map(u => (
        <div
          key={u.user_id}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-r-md text-[8px] font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: u.color }}
        >
          {u.display_name}
        </div>
      ))}
    </div>
  );
}
