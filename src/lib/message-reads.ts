/**
 * Helpers around the message_reads audit-trail table.
 *
 * The client marks a message as read by upserting (message_id, user_id)
 * with a server-side `read_at`. RLS allows insert only for the calling
 * user's own row, and selects are open so patrons can render the
 * "X/N ont lu" counter.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function markMessageRead(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<void> {
  // Use upsert with onConflict so a re-mark is a no-op (won't bump read_at).
  await supabase
    .from("message_reads")
    .upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
}
