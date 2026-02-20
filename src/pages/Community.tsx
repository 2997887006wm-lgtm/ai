import { useState } from 'react';
import { CommunityFeed } from '@/components/CommunityFeed';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { playClick } from '@/utils/audio';

type FilterType = 'all' | 'liked' | 'bookmarked' | 'mine';

const Community = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');

  const tabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: '广场' },
    { id: 'liked', label: '喜欢' },
    { id: 'bookmarked', label: '收藏' },
    { id: 'mine', label: '我的' },
  ];

  return (
    <div className="min-h-screen bg-background px-4 md:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => { playClick(); navigate('/'); }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={14} />
          返回工作台
        </button>

        <h1 className="text-2xl font-serif-cn font-medium text-foreground mb-2">社区广场</h1>
        <p className="text-sm text-muted-foreground mb-8">发现、分享与收藏精彩视频作品</p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { playClick(); setFilter(t.id); }}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-300 ${
                filter === t.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CommunityFeed filter={filter} />
      </div>
    </div>
  );
};

export default Community;
