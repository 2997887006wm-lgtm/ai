
-- Phase 1: Teams
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members with roles
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role team_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Script sharing (link scripts to teams)
CREATE TABLE public.script_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(script_id, team_id)
);

ALTER TABLE public.script_shares ENABLE ROW LEVEL SECURITY;

-- Comments on shots
CREATE TABLE public.script_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL,
  shot_id TEXT,
  scene_id TEXT,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.script_comments(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;

-- Presence tracking for real-time cursors
CREATE TABLE public.script_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL,
  user_id UUID NOT NULL,
  cursor_position JSONB DEFAULT '{}',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(script_id, user_id)
);

ALTER TABLE public.script_presence ENABLE ROW LEVEL SECURITY;

-- Enable realtime for comments and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_presence;

-- Security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_team_role(_user_id UUID, _team_id UUID)
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.team_members
  WHERE user_id = _user_id AND team_id = _team_id
  LIMIT 1
$$;

-- RLS: Teams
CREATE POLICY "Team members can view their teams"
ON public.teams FOR SELECT
USING (public.is_team_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update teams"
ON public.teams FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams"
ON public.teams FOR DELETE
USING (owner_id = auth.uid());

-- RLS: Team members
CREATE POLICY "Team members can view members"
ON public.team_members FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team admins+ can add members"
ON public.team_members FOR INSERT
WITH CHECK (
  public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin')
  OR auth.uid() = user_id
);

CREATE POLICY "Team admins+ can update members"
ON public.team_members FOR UPDATE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin'));

CREATE POLICY "Team admins+ can remove members"
ON public.team_members FOR DELETE
USING (
  public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin')
  OR auth.uid() = user_id
);

-- RLS: Invitations
CREATE POLICY "Team members can view invitations"
ON public.team_invitations FOR SELECT
USING (public.is_team_member(auth.uid(), team_id) OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team admins+ can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Team admins+ can update invitations"
ON public.team_invitations FOR UPDATE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin') OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team admins+ can delete invitations"
ON public.team_invitations FOR DELETE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin'));

-- RLS: Script shares
CREATE POLICY "Team members can view shared scripts"
ON public.script_shares FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Editors+ can share scripts"
ON public.script_shares FOR INSERT
WITH CHECK (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Editors+ can update shares"
ON public.script_shares FOR UPDATE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Editors+ can remove shares"
ON public.script_shares FOR DELETE
USING (public.get_team_role(auth.uid(), team_id) IN ('owner', 'admin'));

-- RLS: Comments
CREATE POLICY "Script collaborators can view comments"
ON public.script_comments FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.script_shares ss
    WHERE ss.script_id = script_comments.script_id
    AND public.is_team_member(auth.uid(), ss.team_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.scripts s
    WHERE s.id = script_comments.script_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can add comments"
ON public.script_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comment authors can update"
ON public.script_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete"
ON public.script_comments FOR DELETE
USING (auth.uid() = user_id);

-- RLS: Presence
CREATE POLICY "Collaborators can view presence"
ON public.script_presence FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.script_shares ss
    WHERE ss.script_id = script_presence.script_id
    AND public.is_team_member(auth.uid(), ss.team_id)
  )
);

CREATE POLICY "Users can upsert their own presence"
ON public.script_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.script_presence FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
ON public.script_presence FOR DELETE
USING (auth.uid() = user_id);

-- Auto-add owner as team member on team creation
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_team();

-- Trigger to update updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.script_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_script_shares_script ON public.script_shares(script_id);
CREATE INDEX idx_script_comments_script ON public.script_comments(script_id);
CREATE INDEX idx_script_presence_script ON public.script_presence(script_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(invitee_email);
