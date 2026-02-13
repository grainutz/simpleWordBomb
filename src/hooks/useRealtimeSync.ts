import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Presence = {
  p1: boolean;
  p2: boolean;
};

export function useRealtimeSync(
  roomId: string,
  myRole: number | null,
  onSync: (data: any) => void
) {
  const [remoteInput, setRemoteInput] = useState("");
  const [presence, setPresence] = useState<Presence>({ p1: false, p2: false });
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId) return;

    // Fetch initial state
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (data) onSync(data);
    };
    fetchInitial();

    // Setup realtime channel
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myRole?.toString() || 'spectator' } }
    });
    channelRef.current = channel;

    channel
      // Listen for database changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => onSync(payload.new)
      )
      // Listen for typing events
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.role !== myRole) {
          setRemoteInput(payload.text);
        }
      })
      // Listen for timer sync
      .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
        // Timer sync is handled in useGameTimer via the parent hook
      })
      // Track presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresence({
          p1: !!state['1'],
          p2: !!state['2']
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && myRole) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myRole]);

  const sendTyping = (text: string, role: number | null) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { text, role }
    });
  };

  return {
    remoteInput,
    presence,
    channelRef,
    sendTyping
  };
}