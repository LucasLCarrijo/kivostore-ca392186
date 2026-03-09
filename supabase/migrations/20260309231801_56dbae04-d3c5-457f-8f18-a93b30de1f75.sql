
-- ═══ KIVO CIRCLES — Complete Schema ═══

-- ═══ ENUMS ═══
CREATE TYPE community_access_type AS ENUM ('FREE_WITH_PRODUCT', 'PAID_SUBSCRIPTION', 'OPEN');
CREATE TYPE community_member_role AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');
CREATE TYPE community_member_status AS ENUM ('PENDING', 'ACTIVE', 'MUTED', 'BANNED', 'LEFT');
CREATE TYPE post_type AS ENUM ('DISCUSSION', 'QUESTION', 'POLL', 'ANNOUNCEMENT', 'WIN');
CREATE TYPE event_status AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE rsvp_status AS ENUM ('GOING', 'MAYBE', 'NOT_GOING');
CREATE TYPE notification_type AS ENUM ('POST_REPLY', 'COMMENT_REPLY', 'POST_LIKE', 'COMMENT_LIKE', 'MENTION', 'NEW_EVENT', 'NEW_POST_IN_SPACE', 'MEMBER_JOINED', 'LEVEL_UP', 'POST_PINNED');
CREATE TYPE point_action AS ENUM ('POST_CREATED', 'COMMENT_CREATED', 'LIKE_RECEIVED', 'POST_LIKED', 'COURSE_COMPLETED', 'EVENT_ATTENDED', 'DAILY_LOGIN', 'STREAK_BONUS', 'ADMIN_BONUS', 'ADMIN_PENALTY');

-- ═══ TABELA 1: COMMUNITIES ═══
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  cover_image_url TEXT,
  icon_url TEXT,
  access_type community_access_type NOT NULL DEFAULT 'OPEN',
  linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  require_approval BOOLEAN NOT NULL DEFAULT false,
  allow_member_posts BOOLEAN NOT NULL DEFAULT true,
  allow_member_events BOOLEAN NOT NULL DEFAULT false,
  points_per_post INT NOT NULL DEFAULT 3,
  points_per_comment INT NOT NULL DEFAULT 1,
  points_per_like_received INT NOT NULL DEFAULT 1,
  points_per_course_completed INT NOT NULL DEFAULT 10,
  points_per_daily_login INT NOT NULL DEFAULT 1,
  member_count INT NOT NULL DEFAULT 0,
  post_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_community_workspace UNIQUE (workspace_id),
  CONSTRAINT uq_community_slug UNIQUE (slug)
);
CREATE INDEX idx_communities_workspace ON communities(workspace_id);
CREATE INDEX idx_communities_slug ON communities(slug);

-- ═══ TABELA 2: COMMUNITY_MEMBERS ═══
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  role community_member_role NOT NULL DEFAULT 'MEMBER',
  status community_member_status NOT NULL DEFAULT 'ACTIVE',
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  total_points INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  muted_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_member_community_user UNIQUE (community_id, user_id)
);
CREATE INDEX idx_cm_community_status ON community_members(community_id, status);
CREATE INDEX idx_cm_community_points ON community_members(community_id, total_points DESC);
CREATE INDEX idx_cm_user ON community_members(user_id);

-- ═══ TABELA 3: COMMUNITY_SPACES ═══
CREATE TABLE community_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '💬',
  color TEXT DEFAULT '#6C3CE1',
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  only_admins_can_post BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  post_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_space_community_slug UNIQUE (community_id, slug)
);
CREATE INDEX idx_spaces_community_pos ON community_spaces(community_id, position);

-- ═══ TABELA 4: COMMUNITY_POSTS ═══
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  post_type post_type NOT NULL DEFAULT 'DISCUSSION',
  title TEXT NOT NULL,
  body TEXT,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  link_url TEXT,
  link_preview_data JSONB,
  poll_options JSONB,
  poll_ends_at TIMESTAMPTZ,
  poll_allow_multiple BOOLEAN DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_answered BOOLEAN DEFAULT false,
  best_answer_id UUID,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_posts_space_created ON community_posts(space_id, created_at DESC);
CREATE INDEX idx_posts_community_created ON community_posts(community_id, created_at DESC);
CREATE INDEX idx_posts_author ON community_posts(author_id);
CREATE INDEX idx_posts_pinned ON community_posts(community_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_posts_community_type ON community_posts(community_id, post_type);

-- ═══ TABELA 5: COMMUNITY_COMMENTS ═══
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_best_answer BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_comments_post_created ON community_comments(post_id, created_at ASC);
CREATE INDEX idx_comments_parent ON community_comments(parent_id);
CREATE INDEX idx_comments_author ON community_comments(author_id);

-- ═══ TABELA 6: COMMUNITY_REACTIONS ═══
CREATE TABLE community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reaction_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX uq_reaction_post ON community_reactions(member_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reaction_comment ON community_reactions(member_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_reactions_post ON community_reactions(post_id);
CREATE INDEX idx_reactions_comment ON community_reactions(comment_id);
CREATE INDEX idx_reactions_member ON community_reactions(member_id);

-- ═══ TABELA 7: COMMUNITY_EVENTS ═══
CREATE TABLE community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  meeting_url TEXT,
  meeting_platform TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  status event_status NOT NULL DEFAULT 'UPCOMING',
  max_attendees INT,
  rsvp_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_community_date ON community_events(community_id, starts_at);
CREATE INDEX idx_events_status ON community_events(community_id, status);

-- ═══ TABELA 8: COMMUNITY_EVENT_RSVPS ═══
CREATE TABLE community_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'GOING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_rsvp_event_member UNIQUE (event_id, member_id)
);
CREATE INDEX idx_rsvps_event ON community_event_rsvps(event_id, status);

-- ═══ TABELA 9: COMMUNITY_POINTS_LOG ═══
CREATE TABLE community_points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  action point_action NOT NULL,
  points INT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_points_member ON community_points_log(member_id, created_at DESC);
CREATE INDEX idx_points_community_created ON community_points_log(community_id, created_at DESC);
CREATE INDEX idx_points_community_action ON community_points_log(community_id, action);

-- ═══ TABELA 10: COMMUNITY_NOTIFICATIONS ═══
CREATE TABLE community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES community_members(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_recipient_unread ON community_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notif_community ON community_notifications(community_id, created_at DESC);

-- ═══ TABELA 11: POLL_VOTES ═══
CREATE TABLE community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_poll_vote UNIQUE (post_id, member_id, option_id)
);
CREATE INDEX idx_poll_votes_post ON community_poll_votes(post_id);

-- ═══ TABELA 12: SPACE_SUBSCRIPTIONS ═══
CREATE TABLE community_space_subscriptions (
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  notify_new_posts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, space_id)
);

-- ═══ SECURITY DEFINER FUNCTION (avoid RLS recursion) ═══
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id UUID, _community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE user_id = _user_id AND community_id = _community_id AND status = 'ACTIVE'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_community_member_id(_user_id UUID, _community_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM community_members
  WHERE user_id = _user_id AND community_id = _community_id AND status = 'ACTIVE'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_community_member_ids_for_user(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM community_members WHERE user_id = _user_id AND status = 'ACTIVE'
$$;

CREATE OR REPLACE FUNCTION public.get_community_ids_for_user(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id FROM community_members WHERE user_id = _user_id AND status = 'ACTIVE'
$$;

-- ═══ RLS POLICIES (recursion-safe) ═══

-- Communities
CREATE POLICY "communities_select" ON communities FOR SELECT USING (is_active = true);
CREATE POLICY "communities_insert" ON communities FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);
CREATE POLICY "communities_update" ON communities FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);

-- Members (using security definer to avoid recursion)
CREATE POLICY "members_select" ON community_members FOR SELECT USING (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
  OR user_id = auth.uid()
);
CREATE POLICY "members_insert" ON community_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update_self" ON community_members FOR UPDATE USING (user_id = auth.uid());

-- Spaces
CREATE POLICY "spaces_select" ON community_spaces FOR SELECT USING (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
  AND is_visible = true
);
CREATE POLICY "spaces_manage" ON community_spaces FOR ALL USING (
  community_id IN (SELECT c.id FROM communities c JOIN workspace_members wm ON wm.workspace_id = c.workspace_id WHERE wm.user_id = auth.uid() AND wm.role IN ('OWNER', 'ADMIN'))
);

-- Posts
CREATE POLICY "posts_select" ON community_posts FOR SELECT USING (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
  AND deleted_at IS NULL
);
CREATE POLICY "posts_insert" ON community_posts FOR INSERT WITH CHECK (
  author_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "posts_update_own" ON community_posts FOR UPDATE USING (
  author_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "posts_delete_own" ON community_posts FOR DELETE USING (
  author_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Comments
CREATE POLICY "comments_select" ON community_comments FOR SELECT USING (
  post_id IN (SELECT id FROM community_posts WHERE community_id IN (SELECT public.get_community_ids_for_user(auth.uid())) AND deleted_at IS NULL)
  AND deleted_at IS NULL
);
CREATE POLICY "comments_insert" ON community_comments FOR INSERT WITH CHECK (
  author_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "comments_update" ON community_comments FOR UPDATE USING (
  author_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Reactions
CREATE POLICY "reactions_select" ON community_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON community_reactions FOR INSERT WITH CHECK (
  member_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "reactions_delete" ON community_reactions FOR DELETE USING (
  member_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Events
CREATE POLICY "events_select" ON community_events FOR SELECT USING (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
);
CREATE POLICY "events_insert" ON community_events FOR INSERT WITH CHECK (
  created_by IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "events_update" ON community_events FOR UPDATE USING (
  created_by IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- RSVPs
CREATE POLICY "rsvps_all" ON community_event_rsvps FOR ALL USING (
  member_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Points log
CREATE POLICY "points_select" ON community_points_log FOR SELECT USING (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
);
CREATE POLICY "points_insert" ON community_points_log FOR INSERT WITH CHECK (
  community_id IN (SELECT public.get_community_ids_for_user(auth.uid()))
);

-- Notifications
CREATE POLICY "notif_select" ON community_notifications FOR SELECT USING (
  recipient_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);
CREATE POLICY "notif_update" ON community_notifications FOR UPDATE USING (
  recipient_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Poll votes
CREATE POLICY "poll_votes_all" ON community_poll_votes FOR ALL USING (
  member_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- Space subscriptions
CREATE POLICY "space_subs_all" ON community_space_subscriptions FOR ALL USING (
  member_id IN (SELECT public.get_community_member_ids_for_user(auth.uid()))
);

-- ═══ TRIGGERS ═══

CREATE OR REPLACE FUNCTION fn_increment_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_spaces SET post_count = post_count + 1 WHERE id = NEW.space_id;
  UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_post_created AFTER INSERT ON community_posts
FOR EACH ROW EXECUTE FUNCTION fn_increment_post_counts();

CREATE OR REPLACE FUNCTION fn_increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_comment_created AFTER INSERT ON community_comments
FOR EACH ROW EXECUTE FUNCTION fn_increment_comment_count();

CREATE OR REPLACE FUNCTION fn_increment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  END IF;
  IF NEW.comment_id IS NOT NULL THEN
    UPDATE community_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_reaction_created AFTER INSERT ON community_reactions
FOR EACH ROW EXECUTE FUNCTION fn_increment_like_count();

CREATE OR REPLACE FUNCTION fn_decrement_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.post_id IS NOT NULL THEN
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  IF OLD.comment_id IS NOT NULL THEN
    UPDATE community_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_reaction_deleted AFTER DELETE ON community_reactions
FOR EACH ROW EXECUTE FUNCTION fn_decrement_like_count();

CREATE OR REPLACE FUNCTION fn_update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communities SET member_count = (
    SELECT COUNT(*) FROM community_members WHERE community_id = COALESCE(NEW.community_id, OLD.community_id) AND status = 'ACTIVE'
  ) WHERE id = COALESCE(NEW.community_id, OLD.community_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_member_changed AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION fn_update_member_count();
