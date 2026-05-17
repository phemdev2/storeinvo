// store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

interface Branch {
  id: string;
  name: string;
  location?: string;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  company_id: string;
}

interface AuthState {
  user: any | null;
  profile: Profile | null;
  branches: Branch[];
  activeBranchId: string | null;
  isLoading: boolean;
  profileError: string | null; // ✅ ADDED: Error state for profile fetching
  login: (email: string, password: string) => Promise<string | null>;
  registerCompany: (
    companyName: string,
    branchName: string,
    name: string,
    email: string,
    password: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setActiveBranch: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      branches: [],
      activeBranchId: null,
      isLoading: true,
      profileError: null, // ✅ ADDED: Initial state

      // ✅ Defined as a plain arrow function — will not be lost on rehydration
      setActiveBranch: (id: string) => set({ activeBranchId: id }),

      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user?.id)
          .single();

        if (!profile) {
          await supabase.auth.signOut();
          return 'Account setup incomplete. Please register again.';
        }

        await get().fetchProfile();
        return null;
      },

      registerCompany: async (companyName, branchName, name, email, password) => {
  // 1. Sign up
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) return authError.message;
  if (!authData.user || !authData.session)
    return 'Failed to create user session. Is email confirmation turned off?';

  // 2. Setup via service role API route
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: authData.user.id,
      companyName,
      branchName,
      name,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    await supabase.auth.signOut();
    return data.error || 'Setup failed. Please try again.';
  }

  set({ activeBranchId: data.branchId });
  await get().fetchProfile();
  return null;
},

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, branches: [], activeBranchId: null, profileError: null });
      },

      fetchProfile: async () => {
  set({ isLoading: true, profileError: null });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // ── Auth session missing = not logged in, not an error ──
    if (authError || !user) {
      set({ isLoading: false, user: null, profile: null });
      return;
    }

    set({ user });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error('Profile missing for this user. Please delete this user in Supabase Auth and register again.');
    }

    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', profile.company_id);

    if (branchError) throw branchError;

    set({
      profile,
      branches: branches || [],
      activeBranchId:
        get().activeBranchId ||
        (branches && branches.length > 0 ? branches[0].id : null),
      isLoading: false,
      profileError: null,
    });

  } catch (error: any) {
    console.error('Fetch profile error:', error.message);

    // Auth session missing is not a real error — user just isn't logged in
    if (
      error.message?.includes('Auth session missing') ||
      error.message?.includes('session_not_found') ||
      error.message?.includes('JWT')
    ) {
      set({ user: null, profile: null, isLoading: false, profileError: null });
      return;
    }

    if (error.message?.includes('Profile missing')) {
      await supabase.auth.signOut();
      set({
        user: null,
        profile: null,
        branches: [],
        activeBranchId: null,
        isLoading: false,
        profileError: error.message,
      });
    } else {
      set({
        profileError: error.message || 'Failed to fetch profile data',
        isLoading: false,
      });
    }
  }
},
    }),
    {
      name: 'pos-auth-storage',
      // ✅ Only persist the branch selection — functions are never persisted
      partialize: (state) => ({ activeBranchId: state.activeBranchId }),
    }
  )
);