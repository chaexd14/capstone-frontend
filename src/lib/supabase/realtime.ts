import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";

type RealtimeStatusCallback = NonNullable<Parameters<RealtimeChannel["subscribe"]>[0]>;

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function subscribeToChannelSafely(
  client: SupabaseClient,
  channel: RealtimeChannel,
  callback: RealtimeStatusCallback,
) {
  try {
    return channel.subscribe(callback);
  } catch (error) {
    callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, normalizeError(error));
    void client.removeChannel(channel).catch(() => undefined);
    return null;
  }
}

export function removeChannelSafely(
  client: SupabaseClient,
  channel: RealtimeChannel | null,
) {
  if (!channel) return;
  void client.removeChannel(channel).catch(() => undefined);
}
