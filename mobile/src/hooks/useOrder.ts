import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/types/database';

export type OrderWithDetails = Order & {
  cafes: { name: string; address: string | null } | null;
  order_items: OrderItem[];
};

export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, cafes(name, address), order_items(*)')
        .eq('id', orderId!)
        .single();
      if (!cancelled) {
        setOrder((data as OrderWithDetails | null) ?? null);
        setLoading(false);
      }
    }
    load();

    // Realtime UPDATE pushes the new row; we re-merge it into our shape
    // (it won't include the joined cafes/order_items, so refetch on each
    // update — orders don't update frequently and this keeps the code tiny).
    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => load(),
      )
      .subscribe();

    // Polling fallback: realtime over websockets can drop on mobile when
    // backgrounded. Cheap insurance every 8s.
    const pollId = setInterval(load, 8_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [orderId]);

  return { order, loading };
}
