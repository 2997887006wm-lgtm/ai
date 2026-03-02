import { FilePlus, ScrollText, Droplets, Video, User, LogIn, Users, Handshake, Globe, BarChart3 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AppSidebarProps {
  credits: number;
  onNewProject: () => void;
  onHistory: () => void;
  onCreditsClick: () => void;
  onVideoLibrary?: () => void;
  onTeam?: () => void;
  activeTab: 'new' | 'history' | 'videos';
}

export function AppSidebar({ credits, onNewProject, onHistory, onCreditsClick, onVideoLibrary, onTeam, activeTab }: AppSidebarProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { id: 'new' as const, icon: FilePlus, title: '新建项目', onClick: onNewProject },
    { id: 'history' as const, icon: ScrollText, title: '历史脚本', onClick: onHistory },
    { id: 'videos' as const, icon: Video, title: '视频库', onClick: onVideoLibrary || (() => {}) },
  ];

  return (
    <aside className="w-[72px] min-h-screen bg-charcoal flex flex-col items-center py-6 justify-between border-r border-charcoal-lighter/50 shrink-0">
      {/* Top nav */}
      <nav className="flex flex-col items-center gap-5">
        <div className="w-8 h-8 rounded-full bg-charcoal-lighter flex items-center justify-center mb-3">
          <span className="font-serif text-xs text-scarlet-light font-semibold">墨</span>
        </div>

        {navItems.map(({ id, icon: Icon, title, onClick }) => (
          <button
            key={id}
            onClick={() => { playClick(); onClick(); }}
            className={`group relative flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg transition-all duration-300 ${
              activeTab === id
                ? 'bg-charcoal-lighter text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light'
            }`}
            title={title}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span className="text-[9px] leading-none">{title}</span>
          </button>
        ))}
      </nav>

      {/* Bottom: team + community + account + credits */}
      <div className="flex flex-col items-center gap-4">
        {/* Team */}
        <button
          onClick={() => { playClick(); onTeam?.(); }}
          className="flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title="团队协作"
        >
          <Handshake size={17} strokeWidth={1.5} />
          <span className="text-[9px] leading-none">团队协作</span>
        </button>

        {/* Report */}
        <button
          onClick={() => { playClick(); navigate('/report'); }}
          className="flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title="使用报告"
        >
          <BarChart3 size={17} strokeWidth={1.5} />
          <span className="text-[9px] leading-none">使用报告</span>
        </button>

        {/* Community */}
        <button
          onClick={() => { playClick(); navigate('/community'); }}
          className="flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title="社区广场"
        >
          <Globe size={17} strokeWidth={1.5} />
          <span className="text-[9px] leading-none">社区广场</span>
        </button>

        {/* Credits */}
        <button
          onClick={() => { playClick(); onCreditsClick(); }}
          className="flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg group cursor-pointer hover:bg-charcoal-light transition-all duration-300"
          title="查看积点"
        >
          <Droplets
            size={17}
            strokeWidth={1.5}
            className="text-scarlet-light/70 group-hover:text-scarlet-light transition-colors duration-500 animate-gentle-pulse"
          />
          <span className="text-[10px] leading-none text-scarlet-light/60 group-hover:text-scarlet-light transition-colors duration-500 font-medium tabular-nums">
            {user ? (profile?.credits ?? credits) : credits}
          </span>
        </button>

        {/* Account / Login */}
        <button
          onClick={() => { playClick(); navigate(user ? '/account' : '/auth'); }}
          className="flex flex-col items-center gap-1 w-14 py-1.5 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light transition-all duration-300"
          title={user ? '我的账号' : '登录'}
        >
          {user ? (
            profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User size={17} strokeWidth={1.5} />
            )
          ) : (
            <LogIn size={17} strokeWidth={1.5} />
          )}
          <span className="text-[9px] leading-none">{user ? '我的' : '登录'}</span>
        </button>
      </div>
    </aside>
  );
}
