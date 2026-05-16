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
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) return authError.message;
        if (!authData.user || !authData.session)
          return 'Failed to create user session. Is email confirmation turned off?';

        try {
          const { data: company, error: compError } = await supabase
            .from('companies')
            .insert({ name: companyName })
            .select('id')
            .single();
          if (compError) throw new Error(compError.message);

          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            company_id: company.id,
            full_name: name,
            role: 'admin',
          });
          if (profileError) throw new Error(profileError.message);

          const { data: branch, error: branchError } = await supabase
            .from('branches')
            .insert({ company_id: company.id, name: branchName })
            .select('id')
            .single();
          if (branchError) throw new Error(branchError.message);

          set({ activeBranchId: branch.id });
          return null;
        } catch (setupError: any) {
          console.error('Setup failed, deleting user:', setupError.message);
          await supabase.auth.signOut();
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${authData.user.id}`,
            {
              method: 'DELETE',
              headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Content-Type': 'application/json',
              },
            }
          );
          return `Setup failed: ${setupError.message}`;
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, branches: [], activeBranchId: null });
      },

      fetchProfile: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          set({ isLoading: false });
          return;
        }

        set({ user });

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          console.error(
            'Profile missing for this user. Please delete this user in Supabase Auth and register again.'
          );
          await supabase.auth.signOut();
          set({ user: null, profile: null, branches: [], activeBranchId: null, isLoading: false });
          return;
        }

        const { data: branches } = await supabase
  .from('branches')
  .select('id, name')  // ✅ removed location
  .eq('company_id', profile.company_id);

        set({
          profile,
          branches: branches || [],
          activeBranchId:
            get().activeBranchId ||
            (branches && branches.length > 0 ? branches[0].id : null),
          isLoading: false,
        });
      },
    }),
    {
      name: 'pos-auth-storage',
      // ✅ Only persist the branch selection — functions are never persisted
      partialize: (state) => ({ activeBranchId: state.activeBranchId }),
    }
  )
);