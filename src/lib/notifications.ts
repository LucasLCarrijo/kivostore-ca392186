import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to create community notifications inline (Option B - frontend approach).
 * Handles deduplication and self-notification prevention.
 */
export async function createNotification({
  communityId,
  recipientId,
  actorId,
  type,
  title,
  body,
  postId,
  commentId,
  eventId,
}: {
  communityId: string;
  recipientId: string;
  actorId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  postId?: string | null;
  commentId?: string | null;
  eventId?: string | null;
}) {
  // Don't notify yourself
  if (actorId && actorId === recipientId) return;

  await supabase.from("community_notifications").insert({
    community_id: communityId,
    recipient_id: recipientId,
    actor_id: actorId || null,
    type: type as any,
    title,
    body: body || null,
    post_id: postId || null,
    comment_id: commentId || null,
    event_id: eventId || null,
  });
}

/**
 * Batch create notifications for multiple recipients.
 */
export async function createBatchNotifications(
  notifications: Array<{
    community_id: string;
    recipient_id: string;
    actor_id?: string | null;
    type: string;
    title: string;
    body?: string | null;
    post_id?: string | null;
    comment_id?: string | null;
    event_id?: string | null;
  }>
) {
  if (notifications.length === 0) return;
  await supabase.from("community_notifications").insert(
    notifications.map((n) => ({
      ...n,
      type: n.type as any,
    }))
  );
}

/**
 * Notify admins/owners when a new member joins.
 */
export async function notifyMemberJoined(communityId: string, memberName: string, newMemberId: string) {
  const { data: admins } = await supabase
    .from("community_members")
    .select("id")
    .eq("community_id", communityId)
    .in("role", ["OWNER", "ADMIN"])
    .eq("status", "ACTIVE");

  if (!admins?.length) return;

  await createBatchNotifications(
    admins
      .filter((a: any) => a.id !== newMemberId)
      .map((a: any) => ({
        community_id: communityId,
        recipient_id: a.id,
        actor_id: newMemberId,
        type: "MEMBER_JOINED",
        title: `👋 ${memberName} entrou na comunidade`,
      }))
  );
}

/**
 * Notify space subscribers when a new post is created.
 */
export async function notifyNewPostInSpace(
  communityId: string,
  spaceId: string,
  spaceName: string,
  postTitle: string,
  postId: string,
  authorId: string,
  authorName: string
) {
  const { data: subs } = await supabase
    .from("community_space_subscriptions")
    .select("member_id")
    .eq("space_id", spaceId)
    .eq("notify_new_posts", true);

  if (!subs?.length) return;

  await createBatchNotifications(
    subs
      .filter((s: any) => s.member_id !== authorId)
      .map((s: any) => ({
        community_id: communityId,
        recipient_id: s.member_id,
        actor_id: authorId,
        type: "NEW_POST_IN_SPACE",
        title: `${authorName} postou em ${spaceName}: ${postTitle.slice(0, 50)}`,
        post_id: postId,
      }))
  );
}
