import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface CompanyData {
  name: string | null;
  address: string | null;
  phone: string | null;
  slug: string | null;
  custom_domain: string | null;
  subscription_status: string | null;
  logo_url: string | null;
  receipt_footer: string | null;
}

interface CompanyStore {
  company: CompanyData | null;
  loading: boolean;
  fetchCompany: (companyId: string) => Promise<void>;
  patchCompany: (patch: Partial<CompanyData>) => void;
}

const EMPTY: CompanyData = {
  name: null,
  address: null,
  phone: null,
  slug: null,
  custom_domain: null,
  subscription_status: null,
  logo_url: null,
  receipt_footer: null,
};

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  company: null,
  loading: false,

  fetchCompany: async (companyId: string) => {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from('companies')
      .select('name, address, phone, slug, custom_domain, subscription_status, logo_url, receipt_footer')
      .eq('id', companyId)
      .single();

    set({
      company: error ? EMPTY : { ...EMPTY, ...data },
      loading: false,
    });
  },

  patchCompany: (patch) =>
    set((s) => ({
      company: s.company ? { ...s.company, ...patch } : s.company,
    })),
}));