import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Mail, Crown, Shield, Pencil, Eye, Trash2, X, Loader2, UserPlus, Settings, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  avatar_url: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name?: string;
  avatar_url?: string;
}

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: '创建者', icon: Crown, color: 'text-amber-500' },
  admin: { label: '管理员', icon: Shield, color: 'text-primary' },
  editor: { label: '编辑', icon: Pencil, color: 'text-foreground' },
  viewer: { label: '查看者', icon: Eye, color: 'text-muted-foreground' },
};

interface TeamPanelProps {
  visible: boolean;
  onClose: () => void;
  onTeamSelect?: (teamId: string) => void;
}

export function TeamPanel({ visible, onClose, onTeamSelect }: TeamPanelProps) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isSaving, setIsSaving] = useState(false);

  const fetchTeams = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTeams(data || []);
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0].id);
      }
    } catch (e) {
      console.error('Fetch teams error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedTeam]);

  const fetchMembers = useCallback(async () => {
    if (!selectedTeam) return;
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', selectedTeam)
        .order('joined_at', { ascending: true });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setMembers(data.map(m => ({
          ...m,
          display_name: profileMap.get(m.user_id)?.display_name || '未知用户',
          avatar_url: profileMap.get(m.user_id)?.avatar_url,
        })));
      } else {
        setMembers([]);
      }
    } catch (e) {
      console.error('Fetch members error:', e);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (visible) fetchTeams();
  }, [visible, fetchTeams]);

  useEffect(() => {
    if (selectedTeam) fetchMembers();
  }, [selectedTeam, fetchMembers]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('teams').insert({
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        owner_id: user.id,
      }).select('id').single();
      if (error) throw error;
      toast.success('团队创建成功');
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreate(false);
      if (data) setSelectedTeam(data.id);
      fetchTeams();
    } catch (e: any) {
      console.error('Create team error:', e);
      toast.error('创建团队失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedTeam || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('team_invitations').insert({
        team_id: selectedTeam,
        inviter_id: user.id,
        invitee_email: inviteEmail.trim(),
        role: inviteRole as any,
      });
      if (error) throw error;
      toast.success(`已发送邀请至 ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (e: any) {
      console.error('Invite error:', e);
      toast.error('邀请发送失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await supabase.from('team_members').delete().eq('id', memberId);
      toast.success('成员已移除');
      fetchMembers();
    } catch (e) {
      toast.error('移除失败');
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeam);
  const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-2xl shadow-elevated flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <span className="text-base font-serif-cn font-medium text-foreground">团队协作空间</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Team list sidebar */}
          <div className="w-48 border-r border-border p-3 space-y-1 overflow-y-auto">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                  selectedTeam === team.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary">{team.name[0]}</span>
                  </div>
                  <span className="truncate">{team.name}</span>
                </div>
              </button>
            ))}

            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus size={12} />
              创建新团队
            </button>
          </div>

          {/* Team detail */}
          <div className="flex-1 p-5 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : !currentTeam ? (
              <div className="text-center py-12">
                <Users size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground/50">创建或加入团队开始协作</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Team info */}
                <div>
                  <h3 className="text-lg font-serif-cn font-medium text-foreground">{currentTeam.name}</h3>
                  {currentTeam.description && (
                    <p className="text-xs text-muted-foreground mt-1">{currentTeam.description}</p>
                  )}
                </div>

                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-foreground">团队成员 ({members.length})</span>
                    {canManage && (
                      <button
                        onClick={() => setShowInvite(true)}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        <UserPlus size={10} /> 邀请
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {members.map(member => {
                      const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
                      const RoleIcon = roleInfo.icon;
                      return (
                        <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-medium text-primary">
                                  {(member.display_name || '?')[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-foreground block">
                                {member.display_name}
                                {member.user_id === user?.id && <span className="text-muted-foreground ml-1">（你）</span>}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 text-[9px] ${roleInfo.color}`}>
                                <RoleIcon size={8} /> {roleInfo.label}
                              </span>
                            </div>
                          </div>
                          {canManage && member.role !== 'owner' && member.user_id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create team dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif-cn">创建新团队</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">为你的影视创作团队起个名字</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="团队名称"
              className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <textarea
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              placeholder="团队简介（可选）"
              rows={2}
              className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <button
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim() || isSaving}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : '创建团队'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif-cn">邀请团队成员</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">通过邮箱邀请协作者加入团队</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="被邀请人邮箱"
              type="email"
              className="w-full text-sm bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex gap-2">
              {(['editor', 'viewer', 'admin'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setInviteRole(role)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] transition-all ${
                    inviteRole === role
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ROLE_LABELS[role].label}
                </button>
              ))}
            </div>
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || isSaving}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : '发送邀请'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
