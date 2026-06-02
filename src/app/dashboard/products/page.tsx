'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import ProductCrudModal from '@/components/ProductCrudModal';
import Sidebar from '@/components/Sidebar';
import { usePosStore } from '@/store/usePosStore';
import { CURRENCY } from '@/lib/types';

const PAGE_SIZE = 50;

interface ProductRow {
  id: string;
  name: string;
  barcode: string | null;
  cost: number;
  price: number;
  stock: number;
  is_variable_price: boolean;
  variants: { id: number; variant_name: string; price: number }[];
}

// ── FIXED: match the Product shape openCrudModal expects
interface ProductModalInput {
  id: string;
  n: string;
  b: string | null;
  p: number;
  s: number;
  c: number;
  is_var: boolean;
  v: { id: number; n: string; p: number }[];
}

const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-[#f4f6fb]">
    <div className="hidden md:block w-56 bg-[#0d1f3c] flex-shrink-0" />
    <div className="flex-1 flex items-center justify-center p-6">{children}</div>
  </div>
);

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── FIXED: return short keys
const toModalInput = (p: ProductRow): ProductModalInput => ({
  id: p.id,
  n: p.name,
  b: p.barcode,
  p: p.price,
  s: p.stock,
  c: p.cost,
  is_var: p.is_variable_price,
  v: p.variants?.map(v => ({ id: v.id, n: v.variant_name, p: v.price }))?? [],
});

const parseNum = (val: string) => {
  const n = parseFloat(val);
  return isNaN(n)? 0 : Math.max(0, Math.min(n, 999999999));
};

export default function ProductsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const openCrudModal = usePosStore((s) => s.openCrudModal);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, stock: 0, variable: 0, value: 0 });

  const debouncedSearch = useDebounce(search, 350);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!user) fetchProfile(); }, [user, fetchProfile]);
  useEffect(() => { if (!isLoadingAuth &&!user) router.push('/login'); }, [isLoadingAuth, user, router]);

  const fetchStats = useCallback(async () => {
    if (!activeBranchId) return;
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('branch_id', activeBranchId);
    let stock = 0, variable = 0, value = 0, page = 0, fetching = true;
    while (fetching) {
      const { data } = await supabase.from('products').select('price, stock, is_variable_price').eq('branch_id', activeBranchId).range(page * 1000, page * 1000 + 999);
      if (!data || data.length === 0) break;
      data.forEach(p => { stock += (p.stock || 0); if (p.is_variable_price) variable++; value += ((p.price || 0) * (p.stock || 0)); });
      if (data.length < 1000) fetching = false; page++;
    }
    setStats({ total: count || 0, stock, variable, value });
  }, [activeBranchId]);

  const fetchPage = useCallback(async (searchTerm: string, from: number, replace: boolean) => {
    if (!activeBranchId) return;
    replace? setLoading(true) : setLoadingMore(true);
    const q = supabase.from('products').select(`id, name, barcode, cost, price, stock, is_variable_price, variants(id, variant_name, price)`).eq('branch_id', activeBranchId).order('name', { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (searchTerm.trim()) q.or(`name.ilike.%${searchTerm.trim()}%,barcode.ilike.%${searchTerm.trim()}%`);
    const { data, error } = await q;
    if (!error && data) {
      setRows(prev => replace? data : [...prev,...data]);
      setOffset(from + data.length);
      setHasMore(data.length === PAGE_SIZE);
    }
    replace? setLoading(false) : setLoadingMore(false);
  }, [activeBranchId]);

  useEffect(() => { if (activeBranchId) { fetchPage(debouncedSearch, 0, true); if (!debouncedSearch) fetchStats(); } }, [debouncedSearch, activeBranchId, fetchPage, fetchStats]);

  const handleDelete = async (id: string, name: string, stock: number, price: number) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Failed: ' + error.message);
    else {
      setRows(prev => prev.filter(p => p.id!== id));
      setStats(s => ({...s, total: s.total - 1, stock: s.stock - (stock || 0), value: s.value - ((price || 0) * (stock || 0)) }));
    }
    setDeletingId(null);
  };

  const exportToCSV = async () => { /*... unchanged... */ };
  const exportToPDF = async () => { /*... unchanged... */ };
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /*... unchanged... */ };

  if (isLoadingAuth ||!profile) return <FullScreen><div className="text-center text-slate-400"><i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i><p className="text-sm">Loading…</p></div></FullScreen>;

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin';
  if (!isAdmin) return <FullScreen><div className="text-center bg-white border rounded-2xl p-10"><h1 className="text-lg font-bold">Access denied</h1></div></FullScreen>;

  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-5 py-3.5 flex items-center justify-between">
          <h1 className="text-sm font-bold">Products</h1>
          <button onClick={() => openCrudModal()} className="bg-[#0d1f3c] text-white px-3.5 py-1.5 rounded-lg text-xs">Add product</button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* your table code unchanged - the key line now works: */}
          {rows.map((product) => (
            <div key={product.id} className="flex justify-between p-3 border-b">
              <span>{product.name}</span>
              <button onClick={() => openCrudModal(toModalInput(product) as any)} className="w-7 h-7 bg-emerald-500 text-white rounded-lg">
                <i className="fas fa-pen text-"></i>
              </button>
            </div>
          ))}
        </main>
      </div>
      <ProductCrudModal />
    </div>
  );
}