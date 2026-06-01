'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import ProductCrudModal from '@/components/ProductCrudModal';
import Sidebar from '@/components/Sidebar';
import { usePosStore } from '@/store/usePosStore';
import { CURRENCY } from '@/lib/types';

// ── Constants ─────────────────────────────────────────
const PAGE_SIZE = 50;
const MAX_STATS_PAGES = 100; // Safety limit: 100 × 1000 = 100K products max for stats

// ── Types ─────────────────────────────────────────────
interface ProductRow {
  id: string;
  name: string;
  image_url: string | null;
  barcode: string | null;
  cost: number;
  price: number;
  stock: number;
  is_variable_price: boolean;
  variants: { id: number; variant_name: string; price: number }[];
}

// ✅ FIX 1: Shape must match ProductCrudModal's `ProductWithMeta` interface
// The modal reads: n, b, p, s, cost, is_var, v: [{id, n, q, p}], image_url, category
interface ProductModalInput {
  id: string;
  n: string;
  image_url: string | null;
  b?: string | null;
  p?: number;
  s?: number;
  cost?: number;
  is_var?: boolean;
  v?: { id: number | string; n: string; q: number; p: number | string }[];
  category?: string | null;
}

// ── FullScreen wrapper ────────────────────────────────
const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-[#f4f6fb]">
    <div className="hidden md:block w-56 bg-[#0d1f3c] flex-shrink-0" />
    <div className="flex-1 flex items-center justify-center p-6">{children}</div>
  </div>
);

// ── Custom debounce hook ──────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ✅ FIX 1: Map database row → shape expected by ProductCrudModal
const toModalInput = (p: ProductRow): ProductModalInput => ({
  id: p.id,
  n: p.name,                              // was: name → now: n
  image_url: p.image_url || null,          // was: image → now: image_url
  b: p.barcode,                            // was: barcode → now: b
  p: p.price,                              // was: price → now: p
  s: p.stock,                              // was: stock → now: s
  cost: p.cost,
  is_var: p.is_variable_price,             // was: isVariablePrice → now: is_var
  v:                                       // was: variants: [{id, name, price}] → now: v: [{id, n, q, p}]
    p.variants?.map((v) => ({
      id: v.id,
      n: v.variant_name,                   // was: name → now: n
      q: 1,                                // ✅ was: missing → now: included
      p: v.price,                          // was: price → now: p
    })) ?? [],
  category: null,
});

// ✅ FIX 2: Escape LIKE special characters in search terms
const escapeLike = (str: string) => str.replace(/[%_\\]/g, '');

// ── Safe number parser for CSV (clamps to 0 - 999999999) ──
const parseNum = (val: string) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.max(0, Math.min(n, 999999999));
};

export default function ProductsPage() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const openCrudModal = usePosStore((s) => s.openCrudModal);
  const crudModalOpen = usePosStore((s) => s.crudModalOpen);

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

  // ✅ FIX 6: Refresh key to re-fetch data after modal operations
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [stats, setStats] = useState({ total: 0, stock: 0, variable: 0, value: 0 });

  const debouncedSearch = useDebounce(search, 350);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!isLoadingAuth && !user) router.push('/login');
  }, [isLoadingAuth, user, router]);

  // ── Fetch stats (aggregate — very fast) ───────────────
  const fetchStats = useCallback(async () => {
    if (!activeBranchId) return;

    // 1. Get exact total count instantly
    const { count, error: countErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', activeBranchId);

    if (countErr) {
      console.error('Failed to fetch product count:', countErr.message);
      return;
    }

    let stock = 0;
    let variable = 0;
    let value = 0;

    // 2. Fetch data in chunks to accurately sum stock and value
    let page = 0;
    let fetching = true;

    // ✅ FIX 3: Safety limit to prevent infinite loop
    while (fetching && page < MAX_STATS_PAGES) {
      const { data, error: dataErr } = await supabase
        .from('products')
        .select('price, stock, is_variable_price')
        .eq('branch_id', activeBranchId)
        .range(page * 1000, page * 1000 + 999);

      if (dataErr) {
        console.error('Failed to fetch stats page:', dataErr.message);
        break;
      }

      if (!data || data.length === 0) break;

      data.forEach((p) => {
        stock += p.stock || 0;
        if (p.is_variable_price) variable++;
        value += (p.price || 0) * (p.stock || 0);
      });

      if (data.length < 1000) fetching = false;
      page++;
    }

    if (page >= MAX_STATS_PAGES) {
      console.warn(`Stats fetch hit safety limit at ${MAX_STATS_PAGES * 1000} products. Consider adding a database RPC for aggregates.`);
    }

    setStats({ total: count || 0, stock, variable, value });
  }, [activeBranchId]);

  // ── Fetch page of products ────────────────────────────
  const fetchPage = useCallback(
    async (searchTerm: string, from: number, replace: boolean) => {
      if (!activeBranchId) return;
      replace ? setLoading(true) : setLoadingMore(true);

      // ✅ FIX 2: Sanitize search term to prevent LIKE wildcard injection
      const safe = escapeLike(searchTerm.trim());

      const q = supabase
        .from('products')
        .select(
          `id, name, image_url, barcode, cost, price, stock, is_variable_price, variants(id, variant_name, price)`
        )
        .eq('branch_id', activeBranchId)
        .order('name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (safe) {
        q.or(`name.ilike.%${safe}%,barcode.ilike.%${safe}%`);
      }

      const { data, error } = await q;

      if (!error && data) {
        setRows((prev) => (replace ? data : [...prev, ...data]));
        setOffset(from + data.length);
        setHasMore(data.length === PAGE_SIZE);
      } else if (error) {
        console.error('Failed to fetch products:', error.message);
      }

      replace ? setLoading(false) : setLoadingMore(false);
    },
    [activeBranchId]
  );

  // ── Re-fetch when search or refreshKey changes ────────
  useEffect(() => {
    if (activeBranchId) {
      fetchPage(debouncedSearch, 0, true);
      if (!debouncedSearch) fetchStats();
    }
  }, [debouncedSearch, activeBranchId, fetchPage, fetchStats, refreshKey]);

  // ✅ FIX 6: Refresh data when modal closes after save
  const prevModalOpen = useRef(false);
  useEffect(() => {
    if (prevModalOpen.current && !crudModalOpen) {
      // Modal just closed — refresh list and stats
      triggerRefresh();
    }
    prevModalOpen.current = crudModalOpen;
  }, [crudModalOpen, triggerRefresh]);

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (id: string, name: string, stock: number, price: number, isVariable: boolean) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setRows((prev) => prev.filter((p) => p.id !== id));
      // ✅ FIX 8: Also adjust variable count
      setStats((s) => ({
        ...s,
        total: s.total - 1,
        stock: s.stock - (stock || 0),
        variable: s.variable - (isVariable ? 1 : 0),
        value: s.value - (price || 0) * (stock || 0),
      }));
    }
    setDeletingId(null);
  };

  // ── Export CSV ────────────────────────────────────────
  const exportToCSV = async () => {
    if (!activeBranchId) return;
    setIsExporting(true);
    try {
      const allRows: ProductRow[] = [];
      let page = 0;
      let fetching = true;
      while (fetching) {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, barcode, cost, price, stock, is_variable_price, variants(id, variant_name, price)'
          )
          .eq('branch_id', activeBranchId)
          .order('name')
          .range(page * 1000, page * 1000 + 999);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) {
          fetching = false;
          break;
        }
        allRows.push(...(data as ProductRow[]));
        if (data.length < 1000) fetching = false;
        page++;
      }

      const headers = [
        'ID',
        'Name',
        'Barcode',
        'Cost',
        'Price',
        'Stock',
        'Variable Price',
        'Variant Name',
        'Variant Price',
      ];
      const csvRows: string[] = [headers.join(',')];
      allRows.forEach((p) => {
        // ✅ Escape newlines in names for CSV safety
        const safeName = (p.name || '').replace(/"/g, '""').replace(/\n/g, ' ');
        if (p.variants?.length > 0) {
          p.variants.forEach((v) => {
            csvRows.push(
              [
                p.id,
                `"${safeName}"`,
                p.barcode || '',
                p.cost || 0,
                p.price || 0,
                p.stock || 0,
                p.is_variable_price ? 'Yes' : 'No',
                `"${v.variant_name}"`,
                v.price,
              ].join(',')
            );
          });
        } else {
          csvRows.push(
            [
              p.id,
              `"${safeName}"`,
              p.barcode || '',
              p.cost || 0,
              p.price || 0,
              p.stock || 0,
              p.is_variable_price ? 'Yes' : 'No',
              '',
              '',
            ].join(',')
          );
        }
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(
        new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      );
      link.download = 'products_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      // ✅ FIX 5: Proper error handling
      alert('CSV export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Export PDF ────────────────────────────────────────
  const exportToPDF = async () => {
    if (!activeBranchId) return;

    const { count, error: countErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', activeBranchId);

    if (countErr) {
      alert('Failed to check product count.');
      return;
    }

    if ((count ?? 0) > 500) {
      const proceed = confirm(
        `You have ${count?.toLocaleString()} products. PDF export is limited to the first 500. Use CSV for the full list. Continue?`
      );
      if (!proceed) return;
    }

    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, barcode, cost, price, stock, is_variable_price, variants(id, variant_name, price)'
        )
        .eq('branch_id', activeBranchId)
        .order('name')
        .range(0, 499);

      if (error) throw new Error(error.message);

      const doc = new jsPDF();
      doc.text('Products List (first 500)', 14, 15);
      const tableData: any[] = [];
      (data as ProductRow[] || []).forEach((p) => {
        if (p.variants?.length > 0) {
          p.variants.forEach((v, i) =>
            tableData.push([
              i === 0 ? p.id.slice(0, 8) + '...' : '',
              i === 0 ? p.name : '',
              i === 0 ? (p.barcode || '-') : '',
              i === 0 ? `₦${CURRENCY.format(p.cost || 0)}` : '',
              i === 0 ? `₦${CURRENCY.format(p.price || 0)}` : '',
              i === 0 ? p.stock || 0 : '',
              v.variant_name,
              `₦${CURRENCY.format(v.price || 0)}`,
            ])
          );
        } else {
          tableData.push([
            p.id.slice(0, 8) + '...',
            p.name,
            p.barcode || '-',
            `₦${CURRENCY.format(p.cost || 0)}`,
            `₦${CURRENCY.format(p.price || 0)}`,
            p.stock || 0,
            '-',
            '-',
          ]);
        }
      });
      autoTable(doc, {
        startY: 20,
        head: [['ID', 'Product', 'Barcode', 'Cost', 'Price', 'Stock', 'Variant', 'Variant Price']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 31, 60] },
      });
      doc.save('products_export.pdf');
    } catch (err: any) {
      // ✅ FIX 5: Proper error handling
      alert('PDF export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── CSV upload ────────────────────────────────────────
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId || !profile?.company_id) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const csvRows = text.split('\n').slice(1);
      const grouped: Record<string, any> = {};
      for (const row of csvRows) {
        if (!row.trim()) continue;
        const cols = row
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map((c) => c.trim().replace(/^"|"$/g, ''));
        let id = cols[0] || null;
        const name = cols[1];
        if (!name && !id) continue;
        const isUUID = id && id.length === 36 && id.includes('-');
        if (!isUUID) id = null;
        const key = id || name;
        if (!grouped[key])
          grouped[key] = {
            id,
            name,
            barcode: cols[2] || null,
            cost: parseNum(cols[3]),
            price: parseNum(cols[4]),
            stock: parseNum(cols[5]),
            is_var: cols[6]?.toLowerCase() === 'yes',
            variants: [],
          };
        const varName = cols[7];
        const varPrice = parseNum(cols[8]);
        if (varName && varPrice > 0) grouped[key].variants.push({ name: varName, price: varPrice });
      }
      const keys = Object.keys(grouped);
      if (!keys.length) {
        alert('No valid rows found.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      let updatedCount = 0;
      try {
        const toUpdate: any[] = [],
          toInsert: any[] = [];
        keys.forEach((key) => {
          const p = grouped[key];
          const data = {
            name: p.name || 'Unnamed',
            barcode: p.barcode,
            cost: p.cost,
            price: p.price,
            stock: p.stock,
            is_variable_price: p.is_var,
          };
          p.id
            ? toUpdate.push({ id: p.id, data, variants: p.variants })
            : toInsert.push({ ...data, variants: p.variants });
        });

        for (const item of toUpdate) {
          const { error } = await supabase
            .from('products')
            .update({ ...item.data, company_id: profile.company_id, branch_id: activeBranchId })
            .eq('id', item.id);
          if (error) throw error;

          // ✅ FIX 4: Only replace variants if the CSV row actually has variant data.
          // If variant columns are empty, leave existing variants intact.
          if (item.variants.length > 0) {
            await supabase.from('variants').delete().eq('product_id', item.id);
            const { error: vErr } = await supabase.from('variants').insert(
              item.variants.map((v: any) => ({
                product_id: item.id,
                variant_name: v.name,
                unit_qty: 1,
                price: v.price,
              }))
            );
            if (vErr) throw vErr;
          }

          updatedCount++;
        }

        if (toInsert.length > 0) {
          const CHUNK = 500;
          for (let i = 0; i < toInsert.length; i += CHUNK) {
            const chunk = toInsert.slice(i, i + CHUNK);
            const { data: inserted, error: insErr } = await supabase
              .from('products')
              .insert(
                chunk.map(({ variants, ...rest }) => ({
                  ...rest,
                  company_id: profile.company_id,
                  branch_id: activeBranchId,
                }))
              )
              .select('id, name');
            if (insErr) throw new Error(insErr.message);
            const varRows: any[] = [];
            inserted?.forEach((p, idx) => {
              chunk[idx].variants.forEach((v: any) =>
                varRows.push({
                  product_id: p.id,
                  variant_name: v.name,
                  unit_qty: 1,
                  price: v.price,
                })
              );
            });
            if (varRows.length > 0) {
              const { error: vErr } = await supabase.from('variants').insert(varRows);
              if (vErr) throw vErr;
            }
          }
        }
        alert(`Done: ${updatedCount} updated, ${toInsert.length} created.`);
        triggerRefresh();
      } catch (err: any) {
        alert(
          `Upload failed. ${updatedCount} updates may have succeeded before the error.\n\n${err.message}`
        );
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ── Guards ────────────────────────────────────────────
  if (isLoadingAuth || !profile)
    return (
      <FullScreen>
        <div className="text-center text-slate-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
          <p className="text-sm">Loading…</p>
        </div>
      </FullScreen>
    );

  const isAdmin = (profile?.role || '').toLowerCase() === 'admin';
  if (!isAdmin)
    return (
      <FullScreen>
        <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 max-w-sm w-full">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-halved text-red-500 text-2xl"></i>
          </div>
          <h1 className="text-lg font-bold text-[#0d1f3c] mb-1">Access denied</h1>
          <p className="text-slate-400 text-sm mb-6">
            You do not have permission to view this page.
          </p>
          <button
            onClick={() => router.push('/pos')}
            className="w-full bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to POS
          </button>
        </div>
      </FullScreen>
    );

  // ── Render ────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-5 md:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#0d1f3c] leading-tight">Products</h1>
              <p className="text-[11px] text-slate-400 leading-tight">
                {stats.total > 0
                  ? `${stats.total.toLocaleString()} total products`
                  : 'Manage inventory and variants'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isExporting}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
                <i className="fas fa-file-import text-xs"></i>
              )}
              {isUploading ? 'Uploading…' : 'Import CSV'}
            </button>

            <button
              onClick={exportToCSV}
              disabled={isExporting || isUploading}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
                <i className="fas fa-file-csv text-emerald-500 text-xs"></i>
              )}
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>

            <button
              onClick={exportToPDF}
              disabled={isExporting || isUploading}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
                <i className="fas fa-file-pdf text-red-500 text-xs"></i>
              )}
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </button>

            <button
              onClick={() => openCrudModal()}
              className="flex items-center gap-1.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <i className="fas fa-plus text-xs"></i> Add product
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Total products',
                value: stats.total.toLocaleString(),
                icon: 'fa-boxes-stacked',
                cls: 'bg-violet-50 text-violet-800 border-violet-200',
              },
              {
                label: 'Total stock',
                value: stats.stock.toLocaleString(),
                icon: 'fa-cubes',
                cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              },
              {
                label: 'Variable price',
                value: stats.variable.toLocaleString(),
                icon: 'fa-tag',
                cls: 'bg-amber-50 text-amber-800 border-amber-200',
              },
              {
                label: 'Inventory value',
                value: `₦${CURRENCY.format(stats.value)}`,
                icon: 'fa-coins',
                cls: 'bg-sky-50 text-sky-800 border-sky-200',
              },
            ].map((card) => (
              <div key={card.label} className={`${card.cls} border rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                    {card.label}
                  </span>
                  <i className={`fas ${card.icon} text-sm opacity-40`}></i>
                </div>
                <p className="text-lg font-bold tracking-tight">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Mobile export buttons */}
          <div className="flex sm:hidden gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isExporting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <i className="fas fa-file-import text-xs"></i> Import
            </button>
            <button
              onClick={exportToCSV}
              disabled={isExporting || isUploading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <i className="fas fa-file-csv text-emerald-500 text-xs"></i> CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting || isUploading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <i className="fas fa-file-pdf text-red-500 text-xs"></i> PDF
            </button>
          </div>

          {/* CSV info */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-800 flex gap-3">
            <i className="fas fa-info-circle mt-0.5 flex-shrink-0 opacity-70"></i>
            <div>
              <p className="font-semibold mb-1">CSV import format (update &amp; create)</p>
              <code className="block bg-sky-100 px-2 py-1 rounded text-[11px] font-mono mb-1">
                ID, Name, Barcode, Cost, Price, Stock, Variable Price, Variant Name, Variant Price
              </code>
              <p className="opacity-80">
                If an <strong>ID</strong> is provided the product will be <strong>updated</strong>.
                Leave blank to <strong>create</strong>. Repeat the row per variant. Leave variant
                columns blank to keep existing variants unchanged.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search by name or barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="py-16 flex justify-center text-slate-400">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-xl mb-2 block opacity-30"></i>
                  <p className="text-xs">Loading products…</p>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <i className="fas fa-box-open text-3xl mb-3 block opacity-20"></i>
                <p className="text-sm font-medium">No products found</p>
                <p className="text-xs mt-1 opacity-70">
                  {search ? 'Try a different search term.' : 'Add a new product to get started.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Product', 'Barcode', 'Cost', 'Price', 'Stock', 'Variants', ''].map(
                          (h, i) => (
                            <th
                              key={i}
                              className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${
                                ['Cost', 'Price'].includes(h)
                                  ? 'text-right'
                                  : i >= 4
                                    ? 'text-center'
                                    : 'text-left'
                              }`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {/* ✅ FIX 7: Show actual product image when available */}
                              {product.image_url ? (
                                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-[#0d1f3c]/5 flex items-center justify-center flex-shrink-0">
                                  <i className="fas fa-box text-[#0d1f3c]/40 text-xs"></i>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {product.name}
                                </p>
                                {product.is_variable_price && (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold uppercase">
                                    Variable
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                            {product.barcode || <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-slate-400">
                            ₦{CURRENCY.format(product.cost || 0)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-semibold text-slate-800">
                            ₦{CURRENCY.format(product.price)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {product.stock === 0 ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-red-50 text-red-700 border-red-200">
                                0 · Out
                              </span>
                            ) : product.stock <= 5 ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200">
                                {product.stock} · Low
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                                {product.stock}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center text-xs text-slate-400">
                            {product.variants?.length || 0}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openCrudModal(toModalInput(product))}
                                className="w-7 h-7 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                title="Edit"
                              >
                                <i className="fas fa-pen text-[10px]"></i>
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(
                                    product.id,
                                    product.name,
                                    product.stock,
                                    product.price,
                                    product.is_variable_price
                                  )
                                }
                                disabled={!!deletingId}
                                className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === product.id ? (
                                  <i className="fas fa-spinner fa-spin text-[10px]"></i>
                                ) : (
                                  <i className="fas fa-trash-alt text-[10px]"></i>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {rows.map((product) => (
                    <div
                      key={product.id}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* ✅ FIX 7: Show actual product image on mobile too */}
                        {product.image_url ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#0d1f3c]/5 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-box text-[#0d1f3c]/40 text-xs"></i>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              ₦{CURRENCY.format(product.price)}
                            </span>
                            {product.stock === 0 ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                                0 · Out
                              </span>
                            ) : product.stock <= 5 ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                                {product.stock} · Low
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                                {product.stock}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => openCrudModal(toModalInput(product))}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                          <i className="fas fa-pen text-[10px]"></i>
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              product.id,
                              product.name,
                              product.stock,
                              product.price,
                              product.is_variable_price
                            )
                          }
                          disabled={!!deletingId}
                          className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === product.id ? (
                            <i className="fas fa-spinner fa-spin text-[10px]"></i>
                          ) : (
                            <i className="fas fa-trash-alt text-[10px]"></i>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more / footer */}
                {hasMore && (
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Showing {rows.length} of {stats.total.toLocaleString()}
                    </p>
                    <button
                      onClick={() => fetchPage(debouncedSearch, offset, false)}
                      disabled={loadingMore}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <i className="fas fa-spinner fa-spin text-xs"></i> Loading…
                        </>
                      ) : (
                        <>
                          <i className="fas fa-chevron-down text-xs"></i> Load more
                        </>
                      )}
                    </button>
                  </div>
                )}
                {!hasMore && rows.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100 text-center text-xs text-slate-300">
                    All {rows.length.toLocaleString()} results shown
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <ProductCrudModal />
    </div>
  );
}