import { supabaseAdmin } from './supabase-admin.ts';

// Atomic "claim" against the webhook_events table. Returns true if this is
// the first time we've seen the (source, event_id) pair, false if it's a
// retry that should be skipped.
export async function claimWebhookEvent(
  source: 'stripe' | 'square',
  eventId: string,
  payload: unknown,
): Promise<{ firstTime: boolean; rowId: string }> {
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .insert({ source, event_id: eventId, payload })
    .select('id')
    .single();

  if (error) {
    // Unique violation on (source, event_id) -> already processed (or in-flight)
    if (error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('webhook_events')
        .select('id')
        .eq('source', source)
        .eq('event_id', eventId)
        .single();
      return { firstTime: false, rowId: existing!.id };
    }
    throw error;
  }
  return { firstTime: true, rowId: data.id };
}

export async function markWebhookProcessed(rowId: string, error?: string): Promise<void> {
  await supabaseAdmin
    .from('webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq('id', rowId);
}
