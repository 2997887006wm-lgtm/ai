import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { playClick } from '@/utils/audio';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const emailSchema = z.string().trim().email('请输入有效的邮箱地址').max(255);
const passwordSchema = z.string().min(6, '密码至少6位').max(100);

type Mode = 'login' | 'register';

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      toast.error(pwResult.error.errors[0].message);
      return;
    }

    playClick();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: emailResult.data,
          password,
          options: {
            data: { full_name: displayName || undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('注册成功！请查收验证邮件');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password,
        });
        if (error) throw error;
        toast.success('登录成功');
        navigate('/');
      }
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    playClick();
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error('登录失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm"
        >
          <ArrowLeft size={14} />
          返回工作台
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center mx-auto mb-4">
            <span className="font-serif text-sm text-scarlet-light font-semibold">幕</span>
          </div>
          <h1 className="text-xl font-serif-cn font-medium text-foreground">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">墨镜 MoJing · AI 视频脚本工作台</p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2.5 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            className="w-full h-10 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google 登录
          </button>
          <button
            onClick={() => handleOAuth('apple')}
            className="w-full h-10 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.67 4.24-3.74 4.25z"/></svg>
            Apple 登录
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">或使用邮箱</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email form */}
        <div className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="昵称（可选）"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={50}
              />
            </div>
          )}
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={255}
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
              maxLength={100}
            />
          </div>
          <button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => { playClick(); setMode(mode === 'login' ? 'register' : 'login'); }}
            className="text-primary hover:underline ml-1"
          >
            {mode === 'login' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
