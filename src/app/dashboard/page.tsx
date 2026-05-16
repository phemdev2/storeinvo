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

type ColorKey = 'purple' | 'green' | 'blue' | 'yellow' | 'indigo' | 'red' | 'emerald';

interface StatCardProps {
  title: string;
  amount: string;
  icon: string;
  color: ColorKey;
}

// ── UI CONFIG ─────────────────────────────────────────
const colorMap: Record<ColorKey, string> = {
  purple:  'bg-purple-100 text-purple-800 border-purple-200',
  green:   'bg-green-100 text-green-800 border-green-200',
  blue:    'bg-blue-100 text-blue-800 border-blue-200',
  yellow:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  indigo:  'bg-indigo-100 text-indigo-800 border-indigo-200',
  red:     'bg-red-100 text-red-800 border-red-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const PAYMENT_BADGE: Record<string, string> = {
  cash:   'bg-emerald-100 text-emerald-700',
  pos:    'bg-blue-100 text-blue-700',
  bank:   'bg-purple-100 text-purple-700',
  credit: 'bg-orange-100 text-orange-700',
};

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
  <div className={`${colorMap[color]} border shadow-sm rounded-xl p-4 hover:shadow-md transition-all hover:scale-[1.02]`}>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <i className={`fas fa-${icon}`}></i>
    </div>
    <hr className="mb-2 opacity-20 border-current" />
    <p className="text-xl font-black">₦{amount}</p>
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
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              {['Order ID', 'Store', 'User', 'Payment', 'Amount', 'Date', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-bold tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 font-mono font-bold text-gray-600 text-xs">
                  POS/{item.id.slice(0, 8)}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{item.branch_name || '—'}</td>
                <td className="px-4 py-2.5 text-gray-700">{item.user_name || 'Unknown'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[item.payment_method?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                    {item.payment_method}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-bold text-gray-900">
                  ₦{formatter.format(item.amount)}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {new Date(item.order_date).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onView(item.id)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    <i className="fas fa-eye"></i> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100 rounded-lg border overflow-hidden">
        {data.map((item, i) => (
          <div key={i} className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-mono font-bold text-gray-600">
                  POS/{item.id.slice(0, 8)}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[item.payment_method?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                  {item.payment_method}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {item.user_name || 'Unknown'} · {item.branch_name || '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(item.order_date).toLocaleString('en-NG')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-none">
              <span className="text-sm font-black text-gray-900">
                ₦{formatter.format(item.amount)}
              </span>
              <button
                onClick={() => onView(item.id)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
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

// ── Main Page ─────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Date Filter States (Default to Today)
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

  useEffect(() => {
    if (profile?.company_id && profile.role?.toLowerCase() === 'admin') fetchStats();
  }, [profile?.company_id, fetchStats]);

  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(getStartOfDay(now));
      setEndDate(getEndOfDay(now));
    } else if (preset === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      setStartDate(getStartOfDay(startOfWeek));
      setEndDate(getEndOfDay(now));
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getStartOfDay(startOfMonth));
      setEndDate(getEndOfDay(now));
    }
  };

  // ── Guards ────────────────────────────────────────
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading session...</p>
      </div>
    </div>
  );

  if (profile.role?.toLowerCase() !== 'admin') return null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading analytics...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-red-400">
        <i className="fas fa-exclamation-circle text-2xl mb-2 block"></i>
        <p className="text-sm mb-3">Failed to load data.</p>
        <button onClick={fetchStats} className="text-xs bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition">
          Retry
        </button>
      </div>
    </div>
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome back, {profile.full_name || 'Admin'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
              title="Refresh"
            >
              <i className="fas fa-sync-alt text-sm"></i>
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-1.5"
            >
              <i className="fas fa-users-cog"></i>
              <span className="hidden sm:inline">Staff</span>
            </button>
            <button
              onClick={() => router.push('/pos')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition flex items-center gap-1.5"
            >
              <i className="fas fa-cash-register"></i>
              <span>Open POS</span>
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week',  label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                  activePreset === p.key
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activePreset === 'custom' && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="date"
                value={startDate.split('T')[0]}
                onChange={(e) => setStartDate(getStartOfDay(new Date(e.target.value)))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 flex-1"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate.split('T')[0]}
                onChange={(e) => setEndDate(getEndOfDay(new Date(e.target.value)))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 flex-1"
              />
            </div>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

        {/* Branch Cards */}
        {data.branch_totals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.branch_totals.map((branch, i) => (
              <div key={i} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-none">
                  <i className="fas fa-store text-blue-600"></i>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{branch.name}</p>
                  <p className="text-xs text-gray-500">
                    {branch.total_orders} orders · ₦{formatter.format(branch.total_amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-black text-gray-800">Transactions</h2>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium text-gray-700 w-full sm:w-auto"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="bank">Bank</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div className="p-4">
            {filteredOrders.length > 0 ? (
              <Table
                data={filteredOrders}
                onView={(id) => setSelectedOrderId(id)}
              />
            ) : (
              <div className="py-12 text-center text-gray-400">
                <i className="fas fa-inbox text-3xl mb-3 block opacity-30"></i>
                <p className="text-sm">No transactions found for this period.</p>
              </div>
            )}
          </div>
        </div>

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