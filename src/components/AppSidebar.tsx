import { FilePlus, ScrollText, Droplets } from 'lucide-react';
import { playClick } from '@/utils/audio';

interface AppSidebarProps {
  credits: number;
  onNewProject: () => void;
  onHistory: () => void;
  onCreditsClick: () => void;
  activeTab: 'new' | 'history';
}

export function AppSidebar({ credits, onNewProject, onHistory, onCreditsClick, activeTab }: AppSidebarProps) {
  return (
    <aside className="w-16 min-h-screen bg-charcoal flex flex-col items-center py-6 justify-between border-r border-charcoal-lighter/50 shrink-0">
      {/* Top nav */}
      <nav className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 rounded-full bg-charcoal-lighter flex items-center justify-center mb-4">
          <span className="font-serif text-xs text-scarlet-light font-semibold">幕</span>
        </div>

        <button
          onClick={() => { playClick(); onNewProject(); }}
          className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
            activeTab === 'new'
              ? 'bg-charcoal-lighter text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light'
          }`}
          title="新建项目"
        >
          <FilePlus size={18} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => { playClick(); onHistory(); }}
          className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
            activeTab === 'history'
              ? 'bg-charcoal-lighter text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-charcoal-light'
          }`}
          title="历史剧本"
        >
          <ScrollText size={18} strokeWidth={1.5} />
        </button>
      </nav>

      {/* Credits indicator */}
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
          {credits}
        </span>
      </button>
    </aside>
  );
}
