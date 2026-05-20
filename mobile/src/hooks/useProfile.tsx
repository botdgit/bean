import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

import { useSession } from './useSession';

type ProfileContextValue = { profile: Profile | null; loading: boolean };

const ProfileContext = createContext<ProfileContextValue>({ profile: null, loading: true });

// Single source of truth for the signed-in user's profile, with ONE realtime
// subscription. Previously each useProfile() call opened a channel named
// `profile:<id>`; multiple simultaneous consumers collided on that name and
// supabase-realtime threw "cannot add postgres_changes callbacks after
// subscribe". Centralizing avoids the collision entirely.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (!cancelled) setProfile(payload.new as Profile);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  return <ProfileContext.Provider value={{ profile, loading }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
