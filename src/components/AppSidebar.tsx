import { FilePlus, ScrollText, Droplets, Video, User, LogIn, Users } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AppSidebarProps {
  credits: number;
  onNewProject: () => void;
  onHistory: () => void;
  onCreditsClick: () => void;
  onVideoLibrary?: () => void;
  activeTab: 'new' | 'history' | 'videos';
}

export function AppSidebar({ credits, onNewProject, onHistory, onCreditsClick, onVideoLibrary, activeTab }: AppSidebarProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { id: 'new' as const, icon: FilePlus, title: '新建项目', onClick: onNewProject },
    { id: 'history' as const, icon: ScrollText, title: '历史脚本', onClick: onHistory },
    { id: 'videos' as const, icon: Video, title: '视频库', onClick: onVideoLibrary || (() => {}) },
  ];

  return (
    <aside className="w-16 min-h-screen bg-charcoal flex flex-col items-center py-6 justify-between border-r border-charcoal-lighter/50 shrink-0">
      {/* Top nav */}
      <nav className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 rounded-full bg-charcoal-lighter flex items-center justify-center mb-4">
          <span className="font-serif text-xs text-scarlet-light font-semibold">墨</span>
        </div>

        {navItems.map(({ id, icon: Icon, title, onClick }) => (
          <button
            key={id}
            onClick={() => { playClick(); onClick(); }}
            className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
              activeTab === id
                ? 'bg-charcoal-lighter text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light'
            }`}
            title={title}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        ))}
      </nav>

      {/* Bottom: community + account + credits */}
      <div className="flex flex-col items-center gap-4">
        {/* Community */}
        <button
          onClick={() => { playClick(); navigate('/community'); }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title="社区广场"
        >
          <Users size={18} strokeWidth={1.5} />
        </button>

        {/* Credits */}
        <button
          onClick={() => { playClick(); onCreditsClick(); }}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
          title="查看积点"
        >
          <Droplets
            size={16}
            strokeWidth={1.2}
            className="text-sidebar-foreground/30 group-hover:text-scarlet-light/50 transition-colors duration-500 animate-gentle-pulse"
          />
          <span className="text-[10px] text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 transition-colors duration-500 font-sans tabular-nums tracking-wide">
            {user ? (profile?.credits ?? credits) : credits}
          </span>
        </button>

        {/* Account / Login */}
        <button
          onClick={() => { playClick(); navigate(user ? '/account' : '/auth'); }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title={user ? '我的账号' : '登录'}
        >
          {user ? (
            profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User size={18} strokeWidth={1.5} />
            )
          ) : (
            <LogIn size={18} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </aside>
  );
}
