import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Cafe } from '@/types/database';

export function useCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('cafes')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setCafes(data ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cafes, loading, error };
}

export function useCafe(cafeId: string | undefined) {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cafeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from('cafes')
      .select('*')
      .eq('id', cafeId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setCafe(data);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  return { cafe, loading };
}
