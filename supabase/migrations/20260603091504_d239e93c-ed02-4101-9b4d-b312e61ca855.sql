
-- 1) Prevent users from updating their own credits
CREATE OR REPLACE FUNCTION public.prevent_self_credits_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    -- Allow only when no auth user is acting (service_role / triggers) 
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Credits cannot be modified by client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_credits_update ON public.profiles;
CREATE TRIGGER profiles_prevent_self_credits_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_credits_update();

-- 2) team_members: remove self-insert/self-delete escalation
DROP POLICY IF EXISTS "Team admins+ can add members" ON public.team_members;
CREATE POLICY "Team admins+ can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_team_role(auth.uid(), team_id) = ANY (ARRAY['owner'::team_role, 'admin'::team_role])
);

DROP POLICY IF EXISTS "Team admins+ can remove members" ON public.team_members;
CREATE POLICY "Team admins+ can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  public.get_team_role(auth.uid(), team_id) = ANY (ARRAY['owner'::team_role, 'admin'::team_role])
  OR auth.uid() = user_id  -- allow leaving the team yourself
);

-- 3) team_invitations: restrict SELECT to admins/owners + invitee
DROP POLICY IF EXISTS "Team members can view invitations" ON public.team_invitations;
CREATE POLICY "Team admins and invitee can view invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  public.get_team_role(auth.uid(), team_id) = ANY (ARRAY['owner'::team_role, 'admin'::team_role])
  OR invitee_email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text
);

-- 4) script_comments: require script access on INSERT
DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.script_comments;
CREATE POLICY "Users can add comments on accessible scripts"
ON public.script_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = script_comments.script_id AND s.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.script_shares ss
      WHERE ss.script_id = script_comments.script_id
        AND public.is_team_member(auth.uid(), ss.team_id)
    )
  )
);

-- 5) community-videos: add UPDATE policy scoped to user folder
DROP POLICY IF EXISTS "Users can update their community videos" ON storage.objects;
CREATE POLICY "Users can update their community videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'community-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6) Lock down trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_team() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_video_bookmark_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_video_like_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_credits_update() FROM PUBLIC, anon, authenticated;
