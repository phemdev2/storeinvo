'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import OrderDetailModal from '@/components/OrderDetailModal';

// ── Types ─────────────────────────────────────────────
interface OrderRow {
  id: string;
  amount: number;
  payment_method: string;
  order_date: string;
  user_name: string;
  branch_name: string;
}

interface DashboardData {
  cash_total: number;
  pos_total: number;
  bank_total: number;
  total_sales: number;
  total_profit: number;
  branch_totals: { name: string; total_amount: number; total_orders: number }[];
  recent_orders: OrderRow[];
}

// ── Top Items ──────────────────────────────────────────
// Wire this up by calling your Supabase RPC/query and setting topItems state.
// Expected shape per row:
interface TopItem {
  item_name: string;     // product/item name
  quantity_sold: number; // total units sold in the period
  revenue: number;       // total revenue from this item
}

type ColorKey = 'purple' | 'green' | 'blue' | 'yellow' | 'emerald';

interface StatCardProps {
  title: string;
  amount: string;
  icon: string;
  color: ColorKey;
}

// ── UI CONFIG ─────────────────────────────────────────
const colorMap: Record<ColorKey, string> = {
  yellow:  'bg-amber-50  text-amber-800  border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  purple:  'bg-violet-50 text-violet-800 border-violet-200',
  green:   'bg-teal-50   text-teal-800   border-teal-200',
  blue:    'bg-sky-50    text-sky-800    border-sky-200',
};

const PAYMENT_BADGE: Record<string, string> = {
  cash:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pos:    'bg-sky-50     text-sky-700     border border-sky-200',
  bank:   'bg-violet-50  text-violet-700  border border-violet-200',
  credit: 'bg-orange-50  text-orange-700  border border-orange-200',
};

// ── Sidebar nav config ────────────────────────────────
const NAV = [
  { label: 'Dashboard',    icon: 'fa-gauge-high',   href: '/dashboard' },
  { label: 'Transactions', icon: 'fa-receipt',       href: '/transactions' },
  { label: 'Branches',     icon: 'fa-store',         href: '/branches' },
  { label: 'Staff',        icon: 'fa-users',         href: '/admin' },
  { label: 'POS',          icon: 'fa-cash-register', href: '/pos' },
  { label: 'Reports',      icon: 'fa-chart-bar',     href: '/reports' },
  { label: 'Settings',     icon: 'fa-gear',          href: '/settings' },
];

// ── Helper Functions ──────────────────────────────────
const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getEndOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

// ── Sub-Components ────────────────────────────────────
const StatCard = ({ title, amount, icon, color }: StatCardProps) => (
  <div className={`${colorMap[color]} border rounded-xl p-4 hover:scale-[1.02] transition-transform`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{title}</span>
      <i className={`fas fa-${icon} text-sm opacity-40`}></i>
    </div>
    <p className="text-lg font-bold tracking-tight">₦{amount}</p>
  </div>
);

const Table = ({ data, onView }: { data: OrderRow[]; onView: (id: string) => void }) => {
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 }),
    []
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Order ID', 'Store', 'User', 'Payment', 'Amount', 'Date', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                  POS/{item.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                  {item.branch_name || '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {item.user_name || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize ${PAYMENT_BADGE[item.payment_method?.toLowerCase()] || 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {item.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                  ₦{formatter.format(item.amount)}
                </td>
                <td className="px-4 py-3 text-slate-400 text-[11px]">
                  {new Date(item.order_date).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onView(item.id)}
                    className="flex items-center gap-1.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <i className="fas fa-eye text-[10px]"></i> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-slate-100">
        {data.map((item, i) => (
          <div key={i} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-mono text-slate-400">POS/{item.id.slice(0, 8)}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize ${PAYMENT_BADGE[item.payment_method?.toLowerCase()] || 'bg-slate-100 text-slate-500'}`}>
                  {item.payment_method}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {item.user_name || 'Unknown'} · {item.branch_name || '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(item.order_date).toLocaleString('en-NG')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="text-sm font-bold text-slate-800">₦{formatter.format(item.amount)}</span>
              <button
                onClick={() => onView(item.id)}
                className="flex items-center gap-1 bg-[#0d1f3c] text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold"
              >
                <i className="fas fa-eye"></i> View
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

// ── Top Items Section ─────────────────────────────────
const TopItemsSection = ({
  items,
  loading,
  formatter,
}: {
  items: TopItem[];
  loading: boolean;
  formatter: Intl.NumberFormat;
}) => {
  const maxQty = items.length > 0 ? Math.max(...items.map((i) => i.quantity_sold)) : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#0d1f3c]">Top selling items</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">By quantity sold today</p>
        </div>
        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
          <i className="fas fa-fire text-amber-500 text-sm"></i>
        </div>
      </div>

      <div className="px-5 py-3">
        {loading ? (
          <div className="py-10 text-center text-slate-400">
            <i className="fas fa-spinner fa-spin text-xl mb-2 block opacity-30"></i>
            <p className="text-xs">Loading items…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <i className="fas fa-box-open text-2xl mb-2 block opacity-20"></i>
            <p className="text-xs">No item data for this period.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((item, i) => {
              const barWidth = Math.round((item.quantity_sold / maxQty) * 100);
              const rankColors = [
                'bg-amber-400', 'bg-slate-300', 'bg-orange-300',
              ];
              return (
                <li key={i} className="py-3 flex items-center gap-4">
                  {/* Rank badge */}
                  <span
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${rankColors[i] ?? 'bg-slate-200 text-slate-500'}`}
                  >
                    {i + 1}
                  </span>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 truncate pr-2">
                        {item.item_name}
                      </span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {item.quantity_sold} sold
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0d1f3c] rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Revenue */}
                  <span className="text-xs font-bold text-slate-800 flex-shrink-0 w-24 text-right">
                    ₦{formatter.format(item.revenue)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

// ── Full-screen state wrapper ─────────────────────────
const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-[#f4f6fb]">
    <div className="hidden md:block w-56 bg-[#0d1f3c] flex-shrink-0" />
    <div className="flex-1 flex items-center justify-center">{children}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [topItemsLoading, setTopItemsLoading] = useState(false);

  const today = new Date();
  const [startDate, setStartDate] = useState(getStartOfDay(today));
  const [endDate, setEndDate] = useState(getEndOfDay(today));
  const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (profile && profile.role?.toLowerCase() !== 'admin') router.push('/pos');
  }, [profile, router]);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data: result, error } = await supabase.rpc('get_admin_dashboard', {
      comp_id: profile.company_id,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) {
      console.error('Supabase RPC error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setData(null);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [profile?.company_id, startDate, endDate]);

  // ── TODO: replace this with your actual Supabase RPC/query ──────────────
  // Example shape of the query you'd write:
  //
  //   SELECT
  //     p.name            AS item_name,
  //     SUM(oi.quantity)  AS quantity_sold,
  //     SUM(oi.quantity * oi.unit_price) AS revenue
  //   FROM order_items oi
  //   JOIN products p ON p.id = oi.product_id
  //   JOIN orders o   ON o.id = oi.order_id
  //   WHERE o.company_id = $1
  //     AND o.order_date BETWEEN $2 AND $3
  //   GROUP BY p.name
  //   ORDER BY quantity_sold DESC
  //   LIMIT 10;
  //
  // Then expose it as an RPC: get_top_items(comp_id, p_start_date, p_end_date)
  // ────────────────────────────────────────────────────────────────────────
    const fetchTopItems = useCallback(async () => {
    if (!profile?.company_id) return;
    setTopItemsLoading(true);
    
    try {
      const { data: result, error } = await supabase.rpc('get_top_items', {
        comp_id: profile.company_id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error('Supabase Top Items error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setTopItems([]);
      } else {
        setTopItems(result ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch top items:', err);
      setTopItems([]);
    }
    
    setTopItemsLoading(false);
  }, [profile?.company_id, startDate, endDate]);

  useEffect(() => {
    if (profile?.company_id && profile.role?.toLowerCase() === 'admin') {
      fetchStats();
      fetchTopItems();
    }
  }, [profile?.company_id, fetchStats, fetchTopItems]);

  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(getStartOfDay(now));
      setEndDate(getEndOfDay(now));
    } else if (preset === 'week') {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      setStartDate(getStartOfDay(s));
      setEndDate(getEndOfDay(now));
    } else if (preset === 'month') {
      setStartDate(getStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1)));
      setEndDate(getEndOfDay(now));
    }
  };

  // ── Guards ────────────────────────────────────────
  if (!profile) return (
    <FullScreen>
      <div className="text-center text-slate-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading session…</p>
      </div>
    </FullScreen>
  );

  if (profile.role?.toLowerCase() !== 'admin') return null;

  if (loading) return (
    <FullScreen>
      <div className="text-center text-slate-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading analytics…</p>
      </div>
    </FullScreen>
  );

  if (!data) return (
    <FullScreen>
      <div className="text-center text-red-400">
        <i className="fas fa-exclamation-circle text-2xl mb-2 block"></i>
        <p className="text-sm mb-3">Failed to load data.</p>
        <button
          onClick={fetchStats}
          className="text-xs bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition"
        >
          Retry
        </button>
      </div>
    </FullScreen>
  );

  // ── Computed ──────────────────────────────────────
  const formatter = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

  const statCards: { title: string; amount: number; icon: string; color: ColorKey }[] = [
    { title: 'Total Sales',  amount: data.total_sales,  icon: 'wallet',      color: 'yellow'  },
    { title: 'Total Profit', amount: data.total_profit, icon: 'chart-line',  color: 'emerald' },
    { title: 'Cash',         amount: data.cash_total,   icon: 'money-bill',  color: 'purple'  },
    { title: 'POS',          amount: data.pos_total,    icon: 'credit-card', color: 'green'   },
    { title: 'Bank',         amount: data.bank_total,   icon: 'university',  color: 'blue'    },
  ];

  const filteredOrders = paymentFilter === 'all'
    ? data.recent_orders
    : data.recent_orders.filter((o) => o.payment_method.toLowerCase() === paymentFilter);

  // ── Render ────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-56 bg-[#0d1f3c] flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex-shrink-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fas fa-store text-white text-sm"></i>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">POSAdmin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.href === '/dashboard';
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white/90 hover:bg-white/5'}
                `}
              >
                <i className={`fas ${item.icon} w-4 text-center text-sm`}></i>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Profile footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(profile.full_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.full_name || 'Admin'}</p>
              <p className="text-white/40 text-[10px]">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-5 md:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#0d1f3c] leading-tight">Dashboard</h1>
              <p className="text-[11px] text-slate-400 leading-tight">
                Welcome back, {profile.full_name || 'Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              title="Refresh"
              className="p-2 text-slate-400 hover:text-[#0d1f3c] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <i className="fas fa-arrows-rotate text-sm"></i>
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <i className="fas fa-users-gear text-xs"></i> Staff
            </button>
            <button
              onClick={() => router.push('/pos')}
              className="flex items-center gap-1.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              <i className="fas fa-cash-register text-xs"></i>
              <span>Open POS</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">

          {/* Date filter */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {(['today', 'week', 'month', 'custom'] as const).map((p) => {
                const labels = { today: 'Today', week: 'This week', month: 'This month', custom: 'Custom' };
                return (
                  <button
                    key={p}
                    onClick={() => handlePresetChange(p)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activePreset === p
                        ? 'bg-[#0d1f3c] text-white border-[#0d1f3c]'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>

            {activePreset === 'custom' && (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={startDate.split('T')[0]}
                  onChange={(e) => setStartDate(getStartOfDay(new Date(e.target.value)))}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  value={endDate.split('T')[0]}
                  onChange={(e) => setEndDate(getEndOfDay(new Date(e.target.value)))}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                />
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                amount={formatter.format(card.amount)}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>

          {/* Branch cards */}
          {data.branch_totals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.branch_totals.map((branch, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="w-9 h-9 bg-[#0d1f3c]/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-store text-[#0d1f3c]/60 text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{branch.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {branch.total_orders} orders · ₦{formatter.format(branch.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top selling items */}
          <TopItemsSection
            items={topItems}
            loading={topItemsLoading}
            formatter={formatter}
          />

          {/* Transactions table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#0d1f3c]">Transactions</h2>
              <select
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">All methods</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="bank">Bank</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="px-4 py-3">
              {filteredOrders.length > 0 ? (
                <Table data={filteredOrders} onView={(id) => setSelectedOrderId(id)} />
              ) : (
                <div className="py-14 text-center text-slate-400">
                  <i className="fas fa-inbox text-3xl mb-3 block opacity-20"></i>
                  <p className="text-sm">No transactions found for this period.</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}