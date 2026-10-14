"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

type DM = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Options = {
  /** The signed-in user's id. Hook does nothing if null. */
  userId: string | null;
  /**
   * Called for every new message where:
   *   - recipient_id === userId (incoming), OR
   *   - sender_id === userId AND recipient_id === withUserId (outgoing to this thread)
   */
  withUserId?: string;
  onMessage: (msg: DM) => void;
};

export function useRealtimeDMs({ userId, withUserId, onMessage }: Options) {
  // Keep the latest onMessage in a ref so we don't resubscribe on every render
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channelName = withUserId ? `dm-thread-${userId}-${withUserId}` : `dm-inbox-${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as DM;
          // If we're viewing a thread, only accept messages from that thread
          if (withUserId && msg.sender_id !== withUserId) return;
          onMessageRef.current(msg);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as DM;
          // Only care about our own outgoing messages if we're in a specific thread
          if (withUserId && msg.recipient_id !== withUserId) return;
          onMessageRef.current(msg);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as DM;
          if (withUserId && msg.sender_id !== withUserId) return;
          onMessageRef.current(msg);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Ready
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime connection issue — the fallback poll will catch up
          console.warn("Realtime DM channel issue:", status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, withUserId]);
}
