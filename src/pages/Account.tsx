import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Droplets, User } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';

const Account = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSignOut = async () => {
    playClick();
    await signOut();
    toast.success('已退出登录');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-sm mx-auto animate-fade-in">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm"
        >
          <ArrowLeft size={14} />
          返回工作台
        </button>

        <h1 className="text-xl font-serif-cn font-medium text-foreground mb-8">我的账号</h1>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-card border border-border">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.display_name || '用户'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        {/* Credits */}
        <div className="p-4 rounded-xl bg-card border border-border mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">积点余额</span>
          </div>
          <p className="text-2xl font-medium text-foreground tabular-nums">
            {profile?.credits ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">每日自动获得免费额度</p>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full h-10 rounded-lg border border-border bg-card hover:bg-destructive/10 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 transition-colors mt-6"
        >
          <LogOut size={14} />
          退出登录
        </button>
      </div>
    </div>
  );
};

export default Account;
