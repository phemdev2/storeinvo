'use client';

/**
 * NovaMart Admin Dashboard
 * Rewritten for clarity, consistency, and design quality.
 *
 * External deps (unchanged from v2):
 *   @/store/useAuthStore  → { user, profile, activeBranchId, isLoading, fetchProfile }
 *   @/store/usePosStore   → { products, fetchProducts, openCrudModal }
 *   @/lib/supabase        → supabase client
 *   @/lib/types           → CURRENCY (Intl.NumberFormat)
 *   @/components/Sidebar
 *   @/components/ProductCrudModal
 *   @/components/OrderDetailModal
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePosStore } from '@/store/usePosStore';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import ProductCrudModal from '@/components/ProductCrudModal';
import OrderDetailModal from '@/components/OrderDetailModal';
import { CURRENCY } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => '₦' + CURRENCY.format(n);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = 'dashboard' | 'analytics' | 'sales' | 'inventory' | 'customers' | 'products';

interface DashStats {
  revenue: number;
  sales: number;
  products: number;
  lowStock: number;
}

interface Sale {
  id: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  user_name: string | null;
  method: string | null;
}

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  total_spent: number;
  last_visit: string | null;
  visit_count: number;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const DARK = {
  bg:         '#0c0c0c',
  bgCard:     '#131313',
  bgDeep:     '#090909',
  bgHover:    '#1a1a1a',
  border:     '#1f1f1f',
  text:       '#e9e5dd',
  textMid:    '#8a8680',
  textMute:   '#525050',
  accent:     '#c9a84c',
  accentText: '#0c0c0c',
  green:      '#7c9a8c',
  amber:      '#a87c4f',
  red:        '#a84c6b',
  blue:       '#6b8caf',
} as const;

const LIGHT = {
  bg:         '#f8f6f2',
  bgCard:     '#ffffff',
  bgDeep:     '#f1ece5',
  bgHover:    '#ede8e0',
  border:     '#e2dbd1',
  text:       '#1a1612',
  textMid:    '#6a6256',
  textMute:   '#aea79c',
  accent:     '#9f7830',
  accentText: '#ffffff',
  green:      '#059669',
  amber:      '#d97706',
  red:        '#dc2626',
  blue:       '#2563eb',
} as const;

type Theme = {
  bg: string; bgCard: string; bgDeep: string; bgHover: string; border: string;
  text: string; textMid: string; textMute: string;
  accent: string; accentText: string;
  green: string; amber: string; red: string; blue: string;
};

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; d: string }[] = [
  { id: 'dashboard', label: 'Dashboard',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'analytics', label: 'Analytics',
    d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'sales', label: 'Sales',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'inventory', label: 'Inventory',
    d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'customers', label: 'Customers',
    d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'products', label: 'Products',
    d: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
];

// ─── Small reusable primitives ────────────────────────────────────────────────

const Icon = ({ d, size = 16, stroke, strokeWidth = 2 }: { d: string; size?: number; stroke?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} fill="none" stroke={stroke || 'currentColor'} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
);

const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 500, color, background: bg }}>
    {label}
  </span>
);

const Spinner = ({ T }: { T: Theme }) => (
  <div style={{ width: 24, height: 24, border: `2px solid ${T.border}`, borderTopColor: T.accent,
    borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

// ─── Main component ──────────────────────────────────────────────────────────

export default function NovaMartDashboard() {
  const router = useRouter();
  const { user, profile, activeBranchId, isLoading, fetchProfile } = useAuthStore();
  const { products, fetchProducts, openCrudModal } = usePosStore();

  // ── UI state ──
  const [isDark, setIsDark]           = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection]         = useState<Section>('dashboard');
  const [search, setSearch]           = useState('');
  const [toast, setToast]             = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // ── Data state ──
  const [stats, setStats]       = useState<DashStats>({ revenue: 0, sales: 0, products: 0, lowStock: 0 });
  const [sales, setSales]       = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]   = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const T = useMemo<Theme>(() => isDark ? DARK : LIGHT, [isDark]);

  // ── Theme persistence ──
  useEffect(() => {
    const saved = localStorage.getItem('nm-theme');
    setIsDark(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => {
    localStorage.setItem('nm-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // ── Auth ──
  useEffect(() => { if (!user) fetchProfile(); }, [user, fetchProfile]);
  useEffect(() => { if (!isLoading && !user) router.push('/login'); }, [isLoading, user, router]);

  // ── Products ──
  useEffect(() => { if (activeBranchId) fetchProducts(activeBranchId); }, [activeBranchId, fetchProducts]);

  // ── Dashboard data ──
  useEffect(() => {
    if (!activeBranchId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const iso = startOfDay.toISOString();

        const [salesTodayRes, productCountRes, lowStockRes, salesRes, customersRes] = await Promise.all([
          supabase.from('orders').select('total').eq('branch_id', activeBranchId).gte('created_at', iso),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('branch_id', activeBranchId),
          supabase.from('products').select('id').eq('branch_id', activeBranchId).lte('stock', 5).gt('stock', 0),
          supabase.from('orders')
            .select('id, total, created_at, customer_name, user_name, method')
            .eq('branch_id', activeBranchId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase.from('customers')
            .select('id, name, phone, total_spent, last_visit, visit_count')
            .eq('branch_id', activeBranchId)
            .order('total_spent', { ascending: false })
            .limit(10),
        ]);

        if (cancelled) return;

        const queryResults = [
          { name: 'salesToday',   res: salesTodayRes },
          { name: 'productCount', res: productCountRes },
          { name: 'lowStock',     res: lowStockRes },
          { name: 'sales',        res: salesRes },
          { name: 'customers',    res: customersRes },
        ];
        for (const { name, res } of queryResults) {
          if (res.error) {
            throw new Error(`[${name}] ${res.error.message ?? res.error.code ?? JSON.stringify(res.error)}`);
          }
        }

        setStats({
          revenue:  salesTodayRes.data?.reduce((acc, x) => acc + (Number(x.total) || 0), 0) ?? 0,
          sales:    salesTodayRes.data?.length ?? 0,
          products: productCountRes.count ?? 0,
          lowStock: lowStockRes.data?.length ?? 0,
        });
        setSales(salesRes.data ?? []);
        setCustomers(customersRes.data ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error('[Dashboard] Load error:', msg);
        showToast('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [activeBranchId]);

  // ── Derived ──
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      (p.n || '').toLowerCase().includes(q) || (p.c || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const lowStockItems  = useMemo(() => products.filter(p => (p.s ?? 0) > 0 && (p.s ?? 0) <= 5), [products]);
  const outOfStockItems = useMemo(() => products.filter(p => (p.s ?? 0) === 0), [products]);

  // ── Actions ──
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

 const deleteProduct = useCallback(async (id: string | number, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    
    if (error) {
      showToast('Error deleting product');
    } else {
      showToast('Product deleted');
    }
  }, [activeBranchId, fetchProducts, showToast]);

  // ─── Global styles ────────────────────────────────────────────────────────

  const globalCSS = `
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.45; } }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:${T.bg}; }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    button { font-family:inherit; }
    table  { border-collapse:collapse; }
  `;

  // ─── Loading screen ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.bg }}>
        <style>{globalCSS}</style>
        <Spinner T={T} />
      </div>
    );
  }

  // ─── Shared styles ─────────────────────────────────────────────────────────

  const card = {
    background: T.bgCard,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 16,
  } as const;

  const tableHeadCell: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: T.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    background: T.bgDeep,
    borderBottom: `1px solid ${T.border}`,
  };

  const tableCell: React.CSSProperties = {
    padding: '11px 16px',
    borderBottom: `1px solid ${T.border}`,
    fontSize: 13,
  };

  // ─── Section renderers ─────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
          borderRadius: 20, background: `${T.accent}14`, border: `1px solid ${T.accent}28`,
          color: T.accent, fontSize: 12, fontWeight: 500, marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent,
            animation: 'pulse 2s infinite' }} />
          Live overview
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.15,
          fontFamily: '"Cormorant Garamond", serif', marginBottom: 6, color: T.text }}>
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'Admin'}
        </h1>
        <p style={{ fontSize: 14, color: T.textMid }}>Here's what's happening in your store today.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 12, marginBottom: 20 }}>
        {[
          { label: "Today's Revenue", value: fmt(stats.revenue), color: T.accent,
            d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: "Today's Sales", value: String(stats.sales), color: T.blue,
            d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { label: 'Products', value: String(stats.products), color: T.green,
            d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          { label: 'Low Stock', value: String(stats.lowStock), color: T.amber,
            d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        ].map(({ label, value, color, d }) => (
          <div key={label} style={{ ...card, padding: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}14`,
              display: 'grid', placeItems: 'center', marginBottom: 10 }}>
              <Icon d={d} size={15} stroke={color} />
            </div>
            <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif',
              color: T.text }}>{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Lower grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Quick actions */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12,
            fontFamily: '"Cormorant Garamond", serif', color: T.text }}>Quick Actions</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Add Product', icon: 'M12 4v16m8-8H4', action: () => openCrudModal() },
              { label: 'New Sale',    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', action: () => router.push('/pos') },
              { label: 'View Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', action: () => setSection('analytics') },
            ].map(({ label, icon, action }) => (
              <button key={label} onClick={action} type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', background: T.bgDeep, border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.text, fontSize: 13, cursor: 'pointer',
                  transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.background = T.bgDeep)}>
                <Icon d={icon} size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif',
              color: T.text }}>Recent Sales</h3>
            <button onClick={() => setSection('sales')} type="button"
              style={{ fontSize: 11, color: T.accent, background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 500 }}>
              View all
            </button>
          </div>
          {sales.slice(0, 4).map(o => (
            <div key={o.id} onClick={() => setSelectedSaleId(o.id)}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>#{o.id.slice(0, 8)}</div>
                <div style={{ fontSize: 11, color: T.textMid }}>{o.customer_name || 'Walk-in'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{fmt(o.total)}</div>
                <div style={{ fontSize: 10, color: T.textMute }}>
                  {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {sales.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: T.textMute, textAlign: 'center', padding: '16px 0' }}>
              No sales today yet
            </p>
          )}
        </div>

        {/* Stock alerts */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12,
            fontFamily: '"Cormorant Garamond", serif', color: T.text }}>Stock Alerts</h3>
          {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
            <p style={{ fontSize: 12, color: T.textMid, textAlign: 'center', padding: '16px 0' }}>
              All stock healthy ✓
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...outOfStockItems.slice(0, 2), ...lowStockItems.slice(0, 3)].map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.text, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{p.n}</span>
                  <Badge
                    label={p.s === 0 ? 'Out' : `${p.s} left`}
                    color={p.s === 0 ? T.red : T.amber}
                    bg={p.s === 0 ? `${T.red}18` : `${T.amber}18`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 18,
        fontFamily: '"Cormorant Garamond", serif', color: T.text }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Bar chart */}
        <div style={{ ...card, gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: T.text }}>
            Sales Trend — Last 7 Days
          </h3>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {[65, 45, 78, 52, 89, 73, 95].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: `${h}%`, minHeight: 12, borderRadius: '4px 4px 2px 2px',
                  background: `linear-gradient(to top, ${T.accent}, ${T.amber})`, opacity: 0.82 }} />
                <span style={{ fontSize: 10, color: T.textMid }}>
                  {['M','T','W','T','F','S','S'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: T.text }}>
            Top Categories
          </h3>
          {[
            { name: 'Beverages', pct: 42, color: T.accent },
            { name: 'Snacks',    pct: 28, color: T.blue  },
            { name: 'Household', pct: 18, color: T.green },
            { name: 'Other',     pct: 12, color: T.textMute },
          ].map(cat => (
            <div key={cat.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: T.text }}>{cat.name}</span>
                <span style={{ fontSize: 11, color: T.textMid }}>{cat.pct}%</span>
              </div>
              <div style={{ height: 5, background: T.bgDeep, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${cat.pct}%`, height: '100%', background: cat.color,
                  borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSales = () => (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif',
          color: T.text }}>Sales</h2>
        <span style={{ fontSize: 12, color: T.textMid }}>{sales.length} records</span>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Sale', 'Customer', 'Amount', 'Payment', 'Time', ''].map(h => (
                  <th key={h} style={tableHeadCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(o => (
                <tr key={o.id} onClick={() => setSelectedSaleId(o.id)}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tableCell, fontFamily: 'monospace', color: T.textMid, fontSize: 12 }}>
                    #{o.id.slice(0, 8)}
                  </td>
                  <td style={tableCell}>{o.customer_name || 'Walk-in'}</td>
                  <td style={{ ...tableCell, fontWeight: 600, color: T.accent }}>{fmt(o.total)}</td>
                  <td style={tableCell}>
                    <Badge
                      label={o.method || 'cash'}
                      color={T.blue}
                      bg={`${T.blue}14`}
                    />
                  </td>
                  <td style={{ ...tableCell, color: T.textMid }}>
                    {new Date(o.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ ...tableCell, color: T.accent, fontSize: 11 }}>View →</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.textMid }}>
                    No sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => {
    const inventoryStats = [
      { label: 'In Stock',     value: products.filter(p => (p.s ?? 0) > 5).length,                  color: T.green },
      { label: 'Low Stock',    value: lowStockItems.length,                                   color: T.amber },
      { label: 'Out of Stock', value: outOfStockItems.length,                                 color: T.red   },
      { label: 'Total Value',  value: fmt(products.reduce((sum, p) => sum + (p.p ?? 0) * (p.s ?? 0), 0)),  color: T.accent },
    ];

    return (
      <div style={{ animation: 'fadeUp 0.25s ease' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16,
          fontFamily: '"Cormorant Garamond", serif', color: T.text }}>Inventory</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, marginBottom: 16 }}>
          {inventoryStats.map(({ label, value, color }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 11, color: T.textMid, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color,
                fontFamily: '"Cormorant Garamond", serif' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: T.text }}>Stock Alerts</h3>
          <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {[...outOfStockItems, ...lowStockItems].slice(0, 12).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 12px', background: T.bgDeep, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: T.bgCard,
                    display: 'grid', placeItems: 'center', fontSize: 12, color: T.textMid }}>
                    {p.n?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{p.n}</div>
                    <div style={{ fontSize: 11, color: T.textMid }}>{p.c || 'General'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge
                    label={p.s === 0 ? 'Out' : `${p.s} left`}
                    color={p.s === 0 ? T.red : T.amber}
                    bg={p.s === 0 ? `${T.red}18` : `${T.amber}18`}
                  />
                  <button onClick={() => openCrudModal(p)} type="button"
                    style={{ fontSize: 11, color: T.accent, background: 'none',
                      border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                    Restock
                  </button>
                </div>
              </div>
            ))}
            {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
              <p style={{ fontSize: 12, color: T.textMid, textAlign: 'center', padding: '20px 0' }}>
                All stock healthy ✓
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomers = () => (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16,
        fontFamily: '"Cormorant Garamond", serif', color: T.text }}>Customers</h2>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Customer', 'Phone', 'Visits', 'Total Spent', 'Last Visit'].map(h => (
                  <th key={h} style={tableHeadCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={tableCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%',
                        background: `${T.accent}1e`, display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 600, color: T.accent, flexShrink: 0 }}>
                        {c.name?.[0] ?? '?'}
                      </div>
                      <span style={{ fontWeight: 500 }}>{c.name || 'Walk-in'}</span>
                    </div>
                  </td>
                  <td style={{ ...tableCell, color: T.textMid }}>{c.phone || '—'}</td>
                  <td style={tableCell}>{c.visit_count ?? 0}</td>
                  <td style={{ ...tableCell, fontWeight: 600, color: T.accent }}>
                    {fmt(c.total_spent ?? 0)}
                  </td>
                  <td style={{ ...tableCell, color: T.textMid }}>
                    {c.last_visit ? new Date(c.last_visit).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: T.textMid }}>
                    No customers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div style={{ animation: 'fadeUp 0.25s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif',
            color: T.text }}>Products</h2>
          <p style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
            {filteredProducts.length} of {products.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ padding: '8px 12px', background: T.bgCard, border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.text, fontSize: 13, width: 200, outline: 'none' }}
          />
          <button onClick={() => openCrudModal()} type="button"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: T.accent, color: T.accentText, border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Icon d="M12 4v16m8-8H4" size={14} />
            Add
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Product', 'Category', 'Price', 'Stock', ''].map(h => (
                  <th key={h} style={tableHeadCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}
                  style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={tableCell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: T.bgDeep,
                        display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {p.image_url
                          ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 14, color: T.textMid }}>{p.n?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: T.text }}>{p.n}</div>
                        <div style={{ fontSize: 11, color: T.textMute, fontFamily: 'monospace' }}>
                          {p.b || 'No barcode'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tableCell, color: T.textMid }}>{p.c || '—'}</td>
                  <td style={{ ...tableCell, fontWeight: 500, fontFamily: '"Cormorant Garamond", serif' }}>
                    {fmt(p.p ?? 0)}
                  </td>
                  <td style={tableCell}>
                    <Badge
                      label={String(p.s ?? 0)}
                      color={(p.s ?? 0) === 0 ? T.red : (p.s ?? 0) <= 5 ? T.amber : T.green}
                      bg={(p.s ?? 0) === 0 ? `${T.red}14` : (p.s ?? 0) <= 5 ? `${T.amber}14` : `${T.green}14`}
                    />
                  </td>
                  <td style={tableCell}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openCrudModal(p)} type="button"
                        style={{ padding: '5px 10px', background: 'none', border: `1px solid ${T.border}`,
                          borderRadius: 6, fontSize: 11, color: T.textMid, cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => deleteProduct(p.id, p.n)} type="button"
                        style={{ padding: '5px 10px', background: 'none', border: `1px solid ${T.border}`,
                          borderRadius: 6, fontSize: 11, color: T.red, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: T.textMid, marginBottom: 8 }}>
                {search ? 'No products found' : 'No products yet'}
              </p>
              {!search && (
                <button onClick={() => openCrudModal()} type="button"
                  style={{ fontSize: 13, color: T.accent, background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  Add your first product →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SECTIONS: Record<Section, () => React.ReactNode> = {
    dashboard: renderDashboard,
    analytics:  renderAnalytics,
    sales:      renderSales,
    inventory:  renderInventory,
    customers:  renderCustomers,
    products:   renderProducts,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg,
      color: T.text, fontFamily: '"DM Sans", sans-serif' }}>
      <style>{globalCSS}</style>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Header ── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40,
          background: `${T.bgCard}F0`, backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${T.border}` }}>
          <div style={{ height: 62, padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

            {/* Left: hamburger + logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" type="button"
                style={{ background: 'none', border: 'none', color: T.textMid,
                  cursor: 'pointer', padding: 6, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                <Icon d="M4 6h16M4 12h16M4 18h16" size={20} />
              </button>

              <button onClick={() => setSection('dashboard')} type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid',
                  placeItems: 'center', background: `linear-gradient(135deg, ${T.accent}, ${T.amber})`,
                  color: T.accentText, fontWeight: 700, fontSize: 17,
                  fontFamily: '"Cormorant Garamond", serif' }}>N</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1,
                    fontFamily: '"Cormorant Garamond", serif', color: T.text }}>NovaMart</div>
                  <div style={{ fontSize: 9, color: T.textMid, letterSpacing: 1.2,
                    textTransform: 'uppercase' }}>Admin</div>
                </div>
              </button>
            </div>

            {/* Center: nav */}
            <nav style={{ display: 'flex', gap: 2 }}>
              {NAV.map(({ id, label, d }) => {
                const active = section === id;
                return (
                  <button key={id} onClick={() => setSection(id)} aria-label={label} type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 13px', borderRadius: 8,
                      background: active ? T.accent : 'transparent',
                      color: active ? T.accentText : T.textMid,
                      border: 'none', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bgHover; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <Icon d={d} size={13} />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Right: controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setIsDark(v => !v)} aria-label="Toggle theme" type="button"
                style={{ width: 34, height: 34, borderRadius: 8, background: 'none',
                  border: `1px solid ${T.border}`, color: T.textMid,
                  display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                {isDark ? '☀' : '🌙'}
              </button>
              <button onClick={() => router.push('/store')} type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
                  background: T.accent, color: T.accentText, border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" size={13} />
                STORE
              </button>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, maxWidth: 1400, margin: '0 auto',
          width: '100%', padding: '24px' }}>
          {SECTIONS[section]()}
        </main>
      </div>

      {/* ── Modals ── */}
      <ProductCrudModal />
      {selectedSaleId && (
        <OrderDetailModal orderId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.bgCard, border: `1px solid ${T.accent}`, color: T.text,
          padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 200,
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeUp 0.2s ease', whiteSpace: 'nowrap' }}>
          <Icon d="M5 13l4 4L19 7" size={15} stroke={T.green} />
          {toast}
        </div>
      )}
    </div>
  );
}
