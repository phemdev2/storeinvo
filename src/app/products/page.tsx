'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import ProductCrudModal from '@/components/ProductCrudModal';
import { CURRENCY } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_SIZE = 100;

// ── Types ─────────────────────────────────────────────
interface QuickEditState {
  productId: string;
  cost: string;
  price: string;
  saving: boolean;
}

interface ProfitModalState {
  productId: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
}

// ── Pagination ────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page numbers: always show first, last, current ±1, with ellipsis
  const pages: (number | '...')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };

  add(1);
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page < totalPages - 2) pages.push('...');
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <p className="text-xs text-gray-400">
        {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-gray-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                p === page
                  ? 'bg-purple-600 text-white border border-purple-600'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}

// ── Action Dropdown ───────────────────────────────────
function ActionMenu({
  product,
  onEdit,
  onDelete,
  onQuickPrice,
  onProfitDetails,
  deletingId,
}: {
  product: any;
  onEdit: () => void;
  onDelete: () => void;
  onQuickPrice: () => void;
  onProfitDetails: () => void;
  deletingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Edit',        icon: 'fa-pen',       color: 'text-emerald-600', action: onEdit },
    { label: 'Quick Price', icon: 'fa-bolt',      color: 'text-blue-600',    action: onQuickPrice },
    { label: 'Profit',      icon: 'fa-chart-pie', color: 'text-purple-600',  action: onProfitDetails },
    { label: 'Delete',      icon: 'fa-trash-alt', color: 'text-red-500',     action: onDelete, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={deletingId === product.id}
        className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 whitespace-nowrap"
      >
        {deletingId === product.id
          ? <i className="fas fa-spinner fa-spin text-[10px]"></i>
          : <><i className="fas fa-ellipsis-h text-[10px]"></i><span className="hidden sm:inline ml-1">Actions</span></>
        }
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${
                item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${item.icon} w-3.5 text-center ${item.color}`}></i>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick Price Modal ─────────────────────────────────
function QuickPriceModal({ state, onClose, onSave }: { state: QuickEditState; onClose: () => void; onSave: (cost: string, price: string) => void }) {
  const [cost, setCost] = useState(state.cost);
  const [price, setPrice] = useState(state.price);
  const margin = (parseFloat(price) || 0) - (parseFloat(cost) || 0);
  const pct = parseFloat(cost) > 0 ? (margin / parseFloat(cost)) * 100 : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-blue-600 px-5 py-4">
          <h3 className="font-black text-white text-base flex items-center gap-2"><i className="fas fa-bolt"></i> Quick Price Update</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cost (₦)</label>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sale Price (₦)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className={`rounded-xl p-3 flex items-center justify-between border ${margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Margin</p>
              <p className={`text-xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₦{CURRENCY.format(margin)}</p>
            </div>
            {pct !== null && (
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase">Markup</p>
                <p className={`text-xl font-black ${pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pct.toFixed(1)}%</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition">Cancel</button>
            <button onClick={() => onSave(cost, price)} disabled={state.saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
              {state.saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profit Modal ──────────────────────────────────────
function ProfitModal({ state, onClose }: { state: ProfitModalState; onClose: () => void }) {
  const cost = state.cost || 0;
  const price = state.price || 0;
  const stock = state.stock || 0;
  const margin = price - cost;
  const markupPct = cost > 0 ? (margin / cost) * 100 : null;
  const marginPct = price > 0 ? (margin / price) * 100 : null;
  const potentialProfit = margin * stock;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
          <p className="text-purple-200 text-xs font-bold uppercase mb-0.5">Profit Details</p>
          <h3 className="font-black text-white text-lg leading-tight">{state.name}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cost Price</p>
              <p className="text-xl font-black text-gray-700">₦{CURRENCY.format(cost)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Sale Price</p>
              <p className="text-xl font-black text-gray-800">₦{CURRENCY.format(price)}</p>
            </div>
          </div>
          <div className={`rounded-xl p-3 border ${margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Margin per Unit</p>
            <p className={`text-2xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₦{CURRENCY.format(margin)}</p>
            <div className="flex gap-4 mt-1">
              {markupPct !== null && <p className="text-xs text-gray-500">Markup: <span className={`font-bold ${markupPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{markupPct.toFixed(1)}%</span></p>}
              {marginPct !== null && <p className="text-xs text-gray-500">Margin: <span className={`font-bold ${marginPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{marginPct.toFixed(1)}%</span></p>}
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Potential Profit <span className="normal-case font-normal text-gray-400">({stock} units)</span></p>
            <p className={`text-2xl font-black ${potentialProfit >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>₦{CURRENCY.format(potentialProfit)}</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();

  const products          = usePosStore((s) => s.products);
  const fetchProducts     = usePosStore((s) => s.fetchProducts);
  const openCrudModal     = usePosStore((s) => s.openCrudModal);
  const isLoadingProducts = usePosStore((s) => s.isLoadingProducts);

  const user           = useAuthStore((s) => s.user);
  const profile        = useAuthStore((s) => s.profile);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isLoadingAuth  = useAuthStore((s) => s.isLoading);
  const fetchProfile   = useAuthStore((s) => s.fetchProfile);

  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [quickEdit,   setQuickEdit]   = useState<QuickEditState | null>(null);
  const [profitModal, setProfitModal] = useState<ProfitModalState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!user) fetchProfile(); }, [user, fetchProfile]);
  useEffect(() => { if (!isLoadingAuth && !user) router.push('/login'); }, [isLoadingAuth, user, router]);
  useEffect(() => { if (!isLoadingAuth && activeBranchId) fetchProducts(activeBranchId); }, [activeBranchId, isLoadingAuth, fetchProducts]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const filteredProducts = useMemo(
    () => products.filter((p) =>
      p.n.toLowerCase().includes(search.toLowerCase()) ||
      p.b?.toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);

  const pagedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page]
  );

  const stats = useMemo(() => ({
    totalProducts:    products.length,
    totalStock:       products.reduce((s, p) => s + (p.s || 0), 0),
    variableProducts: products.filter((p) => p.is_var).length,
    inventoryValue:   products.reduce((s, p) => s + ((p.p || 0) * (p.s || 0)), 0),
  }), [products]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Failed to delete: ' + error.message);
    else if (activeBranchId) await fetchProducts(activeBranchId);
    setDeletingId(null);
  }, [activeBranchId, fetchProducts]);

  const handleQuickPriceSave = useCallback(async (cost: string, price: string) => {
    if (!quickEdit) return;
    setQuickEdit((prev) => prev ? { ...prev, saving: true } : null);
    const { error } = await supabase.from('products').update({ cost: parseFloat(cost) || 0, price: parseFloat(price) || 0 }).eq('id', quickEdit.productId);
    if (error) { alert('Failed to update: ' + error.message); setQuickEdit((prev) => prev ? { ...prev, saving: false } : null); }
    else { if (activeBranchId) await fetchProducts(activeBranchId); setQuickEdit(null); }
  }, [quickEdit, activeBranchId, fetchProducts]);

  const exportToCSV = () => {
    const headers = ['ID','Name','Barcode','Cost','Price','Stock','Variable Price','Variant Name','Variant Price'];
    const rows: any[][] = [];
    products.forEach((p) => {
      if (p.v && p.v.length > 0) {
        p.v.forEach((v) => rows.push([p.id, `"${(p.n||'').replace(/"/g,'""')}"`, p.b||'', p.cost||0, p.p||0, p.s||0, p.is_var?'Yes':'No', `"${(v.n||'').replace(/"/g,'""')}"`, v.p||0]));
      } else {
        rows.push([p.id, `"${(p.n||'').replace(/"/g,'""')}"`, p.b||'', p.cost||0, p.p||0, p.s||0, p.is_var?'Yes':'No', '', '']);
      }
    });
    const blob = new Blob([[headers.join(','), ...rows.map((r) => r.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'products_export.csv'; link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Products List', 14, 15);
    const tableData: any[] = [];
    products.forEach((p) => {
      if (p.v && p.v.length > 0) {
        p.v.forEach((v, i) => tableData.push([i===0?p.id.substring(0,8)+'...':'', i===0?p.n:'', i===0?(p.b||'-'):'', i===0?`₦${CURRENCY.format(p.cost||0)}`:'', i===0?`₦${CURRENCY.format(p.p||0)}`:'', i===0?(p.s||0):'', i===0?(p.is_var?'Yes':'No'):'', v.n||'-', `₦${CURRENCY.format(v.p||0)}`]));
      } else {
        tableData.push([p.id.substring(0,8)+'...', p.n, p.b||'-', `₦${CURRENCY.format(p.cost||0)}`, `₦${CURRENCY.format(p.p||0)}`, p.s||0, p.is_var?'Yes':'No', '-', '-']);
      }
    });
    autoTable(doc, { startY: 20, head: [['ID','Product','Barcode','Cost','Price','Stock','Variable','Variant','V.Price']], body: tableData, theme: 'striped', headStyles: { fillColor: [124, 58, 237] } });
    doc.save('products_export.pdf');
  };

  const parseNum = (val: string, max = 999999999) => Math.min(parseFloat(val) || 0, max);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBranchId || !profile?.company_id) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split('\n').slice(1);
      const grouped: Record<string, any> = {};
      for (const row of rows) {
        if (!row.trim()) continue;
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));
        let id = cols[0] || null;
        const name = cols[1];
        if (!name && !id) continue;
        if (!(id && id.length === 36 && id.includes('-'))) id = null;
        const key = id || name;
        if (!grouped[key]) grouped[key] = { id, name, barcode: cols[2]||null, cost: parseNum(cols[3]), price: parseNum(cols[4]), stock: parseNum(cols[5]), is_var: cols[6]?.toLowerCase()==='yes', variants: [] };
        const varName = cols[7]; const varPrice = parseNum(cols[8]);
        if (varName && varPrice > 0) grouped[key].variants.push({ name: varName, price: varPrice });
      }
      const keys = Object.keys(grouped);
      if (!keys.length) { alert('No valid rows found.'); setIsUploading(false); return; }
      try {
        const toUpdate: any[] = []; const toInsert: any[] = [];
        keys.forEach((k) => {
          const p = grouped[k];
          const data = { name: p.name||'Unnamed', barcode: p.barcode, cost: p.cost, price: p.price, stock: p.stock, is_variable_price: p.is_var };
          if (p.id) toUpdate.push({ id: p.id, data, variants: p.variants });
          else toInsert.push({ ...data, variants: p.variants });
        });
        for (const item of toUpdate) {
          const { error } = await supabase.from('products').update({ ...item.data, company_id: profile.company_id, branch_id: activeBranchId }).eq('id', item.id);
          if (error) throw error;
          await supabase.from('variants').delete().eq('product_id', item.id);
          if (item.variants.length > 0) { const { error: ve } = await supabase.from('variants').insert(item.variants.map((v: any) => ({ product_id: item.id, variant_name: v.name, unit_qty: 1, price: v.price }))); if (ve) throw ve; }
        }
        if (toInsert.length > 0) {
          const { data: inserted, error: ie } = await supabase.from('products').insert(toInsert.map(({ variants, ...rest }) => ({ ...rest, company_id: profile.company_id, branch_id: activeBranchId }))).select('id, name');
          if (ie) throw new Error(ie.message);
          const varBatch: any[] = [];
          inserted?.forEach((p, i) => toInsert[i].variants.forEach((v: any) => varBatch.push({ product_id: p.id, variant_name: v.name, unit_qty: 1, price: v.price })));
          if (varBatch.length > 0) { const { error: ve } = await supabase.from('variants').insert(varBatch); if (ve) throw ve; }
        }
        alert(`Done: ${toUpdate.length} updated, ${toInsert.length} created.`);
        await fetchProducts(activeBranchId);
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (isLoadingAuth || !profile) return <div className="flex h-screen items-center justify-center bg-gray-50"><i className="fas fa-spinner fa-spin text-purple-500 text-2xl"></i></div>;

  if ((profile?.role || '').toLowerCase() !== 'admin') return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <i className="fas fa-lock text-red-400 text-4xl mb-4"></i>
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 text-sm mt-1">You do not have permission to view this page.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Product Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage inventory and variants</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs border border-gray-200 shadow-sm transition disabled:opacity-50">
              {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-import"></i>}
              <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Import CSV'}</span>
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs border border-gray-200 shadow-sm transition">
              <i className="fas fa-file-csv text-emerald-500"></i><span className="hidden sm:inline">Export CSV</span>
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs border border-gray-200 shadow-sm transition">
              <i className="fas fa-file-pdf text-red-500"></i><span className="hidden sm:inline">Export PDF</span>
            </button>
            <button onClick={() => openCrudModal()} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow transition">
              <i className="fas fa-plus"></i> Add Product
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Products',    value: stats.totalProducts,                         icon: 'fa-boxes-stacked', bg: 'bg-purple-50',  color: 'text-purple-600' },
            { label: 'Total Stock', value: stats.totalStock.toLocaleString(),            icon: 'fa-cubes',         bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Variable',    value: stats.variableProducts,                      icon: 'fa-tag',           bg: 'bg-yellow-50',  color: 'text-yellow-600' },
            { label: 'Inv. Value',  value: `₦${CURRENCY.format(stats.inventoryValue)}`, icon: 'fa-coins',         bg: 'bg-blue-50',    color: 'text-blue-600', small: true },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color} flex-none`}>
                <i className={`fas ${s.icon} text-base`}></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
                <p className={`font-black text-gray-800 truncate ${(s as any).small ? 'text-sm' : 'text-lg'}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CSV Info */}
        <details className="bg-blue-50 border border-blue-100 rounded-xl mb-4 text-xs text-blue-800 overflow-hidden">
          <summary className="px-4 py-2.5 font-bold cursor-pointer flex items-center gap-2 select-none">
            <i className="fas fa-info-circle"></i> CSV Import Format
          </summary>
          <div className="px-4 pb-3">
            <code className="block bg-blue-100 px-2 py-1.5 rounded font-mono text-[11px] mb-1.5">
              ID, Name, Barcode, Cost, Price, Stock, Variable Price, Variant Name, Variant Price
            </code>
            <p>Provide an <strong>ID</strong> to update, leave blank to create. Repeat rows for multiple variants.</p>
          </div>
        </details>

        {/* Search */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoadingProducts ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <i className="fas fa-spinner fa-spin text-purple-500 text-2xl"></i>
              <p className="text-xs text-gray-400">Loading all products…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <i className="fas fa-box-open text-3xl mb-3 block opacity-40"></i>
              <p className="font-medium text-sm">No products found</p>
              <p className="text-xs mt-1">Adjust your search or add a new product.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: '12px' }}>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">Product</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap hidden md:table-cell">Barcode</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-right whitespace-nowrap">Cost</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-right whitespace-nowrap">Sale Price</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-right whitespace-nowrap">Margin</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-center whitespace-nowrap">Stock</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-center whitespace-nowrap hidden sm:table-cell">Variants</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wide text-[10px] text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedProducts.map((product) => {
                    const cost   = product.cost || 0;
                    const margin = product.p - cost;
                    const pct    = cost > 0 ? (margin / cost) * 100 : null;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap max-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 flex-none">
                              <i className="fas fa-box text-[10px]"></i>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate text-xs">{product.n}</div>
                              {product.is_var && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded font-semibold uppercase">Var</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-gray-400 font-mono text-[10px] hidden md:table-cell whitespace-nowrap">{product.b || '—'}</td>
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap font-medium">₦{CURRENCY.format(cost)}</td>
                        <td className="px-2 py-2 text-right font-bold text-gray-800 whitespace-nowrap">₦{CURRENCY.format(product.p)}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className={`font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₦{CURRENCY.format(margin)}</span>
                          {pct !== null && <div className={`text-[9px] font-semibold ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct.toFixed(1)}%</div>}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${product.s > 5 ? 'bg-emerald-50 text-emerald-700' : product.s > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                            {product.s}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-gray-400 hidden sm:table-cell">{product.v?.length || 0}</td>
                        <td className="px-2 py-2 text-center">
                          <ActionMenu
                            product={product}
                            deletingId={deletingId}
                            onEdit={() => openCrudModal(product)}
                            onDelete={() => handleDelete(product.id, product.n)}
                            onQuickPrice={() => setQuickEdit({ productId: product.id, cost: String(product.cost || 0), price: String(product.p || 0), saving: false })}
                            onProfitDetails={() => setProfitModal({ productId: product.id, name: product.n, cost: product.cost || 0, price: product.p || 0, stock: product.s || 0 })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoadingProducts && filteredProducts.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filteredProducts.length}
            onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

      </div>

      <ProductCrudModal />
      {quickEdit && <QuickPriceModal state={quickEdit} onClose={() => setQuickEdit(null)} onSave={handleQuickPriceSave} />}
      {profitModal && <ProfitModal state={profitModal} onClose={() => setProfitModal(null)} />}
    </div>
  );
}