import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Droplets, User, Camera, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Account = () => {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);

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

  const handleAvatarUpload = async () => {
    playClick();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }

      setUploadingAvatar(true);
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
        await refreshProfile();
        toast.success('头像已更新');
      } catch (e: any) {
        console.error('Avatar upload error:', e);
        toast.error('上传失败');
      }
      setUploadingAvatar(false);
    };
    input.click();
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await supabase.from('profiles').update({ display_name: newName.trim() }).eq('user_id', user.id);
      await refreshProfile();
      setEditingName(false);
      toast.success('昵称已更新');
    } catch {
      toast.error('更新失败');
    }
    setSavingName(false);
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
          <button
            onClick={handleAvatarUpload}
            disabled={uploadingAvatar}
            className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 relative group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-colors"
            title="更换头像"
          >
            {uploadingAvatar ? (
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            ) : profile?.avatar_url ? (
              <>
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera size={16} className="text-white" />
                </div>
              </>
            ) : (
              <>
                <User size={20} className="text-muted-foreground" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera size={16} className="text-white" />
                </div>
              </>
            )}
          </button>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-secondary rounded-md px-2 py-1 text-sm text-foreground outline-none border border-border focus:border-primary/30"
                  placeholder="输入新昵称"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !newName.trim()}
                  className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                >
                  {savingName ? '...' : '保存'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.display_name || '用户'}
                </p>
                <button
                  onClick={() => { playClick(); setNewName(profile?.display_name || ''); setEditingName(true); }}
                  className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  修改
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
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
          <button
            onClick={() => {
              playClick();
              const base = (import.meta.env.VITE_AFDIAN_RECHARGE_URL || 'https://ifdian.net/order/create?plan_id=858d43160f2811f1bb4c52540025c377&product_type=0&remark=&affiliate_code=&fr=afcom').replace(/\/$/, '');
              const url = user?.id ? `${base}${base.includes('?') ? '&' : '?'}custom_order_id=${encodeURIComponent(user.id)}` : base;
              window.open(url, '_blank');
            }}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm"
          >
            5元/月 可选期限 积点=月份×50
          </button>
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
