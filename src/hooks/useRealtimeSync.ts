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

    const fetchInitial = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (data) onSync(data);
    };
    fetchInitial();

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myRole?.toString() || 'spectator' } }
    });
    channelRef.current = channel;

    channel
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
      // typing event listener
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.role !== myRole) {
          setRemoteInput(payload.text);
        }
      })
      // timer sync listener
      .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      })
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