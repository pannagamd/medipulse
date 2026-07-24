import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { HealthProfile } from '@/types/api';

/**
 * Profile is complete when the user has filled in:
 *  - full_name (from auth user)
 *  - age
 *  - gender
 *  - allergies  (even "None" counts)
 *  - medical_conditions  (even "None" counts)
 *
 * This is checked here; the auth user's full_name is passed in by the caller.
 */
export function checkProfileComplete(profile: HealthProfile | null, fullName: string | null | undefined): boolean {
  if (!profile) return false;
  if (!fullName?.trim()) return false;
  if (!profile.age || profile.age <= 0) return false;
  if (!profile.gender?.trim()) return false;
  if (!profile.allergies?.trim()) return false;
  if (!profile.medical_conditions?.trim()) return false;
  return true;
}

interface ProfileState {
  profile: HealthProfile | null;
  profileLoaded: boolean;
  setProfile: (profile: HealthProfile | null) => void;
  setProfileLoaded: (loaded: boolean) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      // profileLoaded starts as false on every page load — it is set to true
      // only after AuthBootstrap finishes the API fetch (success or failure).
      // Persisting `profile` gives an instant cache hit; profileLoaded signals
      // that the authoritative API response has been received this session.
      profileLoaded: false,
      setProfile: (profile) => set({ profile }),
      setProfileLoaded: (loaded) => set({ profileLoaded: loaded }),
    }),
    {
      name: 'medipulse-profile',
      // Only persist the profile data itself — NOT profileLoaded.
      // profileLoaded must always restart as false so guards know whether the
      // API has confirmed the cached data in the current session.
      partialize: (state) => ({
        profile: state.profile,
      }),
    },
  ),
);
