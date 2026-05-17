'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

const NAV = [
  { label: 'Dashboard',    icon: 'fa-gauge-high',   href: '/dashboard' },
  { label: 'Transactions', icon: 'fa-receipt',       href: '/transactions' },
  { label: 'Branches',     icon: 'fa-store',         href: '/branches' },
  { label: 'Staff',        icon: 'fa-users',         href: '/admin' },
  { label: 'POS',          icon: 'fa-cash-register', href: '/pos' },
  { label: 'Reports',      icon: 'fa-chart-bar',     href: '/reports' },
  { label: 'Settings',     icon: 'fa-gear',          href: '/settings' },
];

// Paystack plan codes — replace with your actual codes from Paystack dashboard
const PLANS = {
  monthly:  { code: 'PLN_f9ot8hc6p0f4bcq',  amount: 10000,  label: 'Monthly',  period: '/mo'  },
  annually: { code: 'PLN_annually_xxx', amount: 99000, label: 'Yearly',   period: '/yr'  },
};

interface Subscription {
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-[#f4f6fb]">
    <div className="hidden md:block w-56 bg-[#0d1f3c] flex-shrink-0" />
    <div className="flex-1 flex items-center justify-center">{children}</div>
  </div>
);

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    trial:   'bg-amber-50 text-amber-700 border-amber-200',
    active:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border capitalize ${map[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {status === 'trial' ? '🕐 Free Trial' : status === 'active' ? '✅ Active' : '❌ Expired'}
    </span>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, fetchProfile } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'account'>('billing');
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [initiating, setInitiating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Show success message if redirected back from Paystack
 useEffect(() => {
  if (searchParams.get('status') === 'success') {
    setSuccessMsg('🎉 Payment successful! Your subscription is being activated.');
  }
  if (searchParams.get('tab') === 'billing') setActiveTab('billing');
  if (searchParams.get('reason') === 'expired') {
    setActiveTab('billing');
    setSuccessMsg(''); 
  }
}, [searchParams]);

  // Fetch subscription data
  useEffect(() => {
    const fetchSub = async () => {
      if (!profile?.company_id) return;
      setLoadingSub(true);
      const { data } = await supabase
        .from('companies')
        .select('subscription_status, subscription_plan, trial_ends_at, subscription_ends_at')
        .eq('id', profile.company_id)
        .single();
      setSub(data);
      setLoadingSub(false);
    };
    fetchSub();
  }, [profile?.company_id]);

  const handleSubscribe = async (planKey: 'monthly' | 'annually') => {
    if (!profile) return;
    setInitiating(planKey);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInitiating(null); return; }

    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        plan: PLANS[planKey].code,
        companyId: profile.company_id,
      }),
    });

    const data = await res.json();
    setInitiating(null);

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Failed to initialize payment');
    }
  };

  if (!profile) return (
    <FullScreen>
      <div className="text-center text-slate-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading…</p>
      </div>
    </FullScreen>
  );

  const isAdmin = profile.role?.toLowerCase() === 'admin';
  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-[#0d1f3c] flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex-shrink-0
      `}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fas fa-store text-white text-sm"></i>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">POSAdmin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.href === '/settings';
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                  ${active ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`}
              >
                <i className={`fas ${item.icon} w-4 text-center text-sm`}></i>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(profile.full_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{profile.full_name || 'Admin'}</p>
              <p className="text-white/40 text-[10px] capitalize">{profile.role}</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              title="Sign out"
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <i className="fas fa-arrow-right-from-bracket text-xs"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-5 md:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#0d1f3c] leading-tight">Settings</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Manage your account & subscription</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
            {(['billing', 'account'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-[#0d1f3c] text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className={`fas ${tab === 'billing' ? 'fa-credit-card' : 'fa-user'} mr-1.5`}></i>
                {tab}
              </button>
            ))}
          </div>

          {/* ── BILLING TAB ── */}
          {activeTab === 'billing' && (
            <div className="space-y-4 max-w-2xl">

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                  {successMsg}
                </div>
              )}

              {/* Current Status */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-4">Current subscription</h2>

                {loadingSub ? (
                  <div className="text-slate-400 text-xs">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Loading…
                  </div>
                ) : sub ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      <StatusBadge status={sub.subscription_status} />
                    </div>

                    {sub.subscription_status === 'trial' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Trial ends</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatDate(sub.trial_ends_at)}
                          <span className="ml-1.5 text-amber-600 font-bold">({trialDaysLeft}d left)</span>
                        </span>
                      </div>
                    )}

                    {sub.subscription_status === 'active' && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Plan</span>
                          <span className="text-xs font-semibold text-slate-700 capitalize">
                            {sub.subscription_plan || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Renews</span>
                          <span className="text-xs font-semibold text-slate-700">
                            {formatDate(sub.subscription_ends_at)}
                          </span>
                        </div>
                      </>
                    )}

                    {sub.subscription_status === 'expired' && (
                      <p className="text-xs text-red-500">
                        Your subscription has expired. Choose a plan below to reactivate.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No subscription data found.</p>
                )}
              </div>
{searchParams.get('reason') === 'expired' && (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
    <i className="fas fa-lock mt-0.5 shrink-0"></i>
    <div>
      <p className="font-semibold mb-1">Your access has been restricted</p>
      <p className="text-xs text-red-600">
        Your trial or subscription has expired. Subscribe below to restore full access to POS, Dashboard, and all features.
      </p>
    </div>
  </div>
)}
              {/* Plans — only show if not active */}
              {(!sub || sub.subscription_status !== 'active') && isAdmin && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#0d1f3c] mb-1">Choose a plan</h2>
                  <p className="text-[11px] text-slate-400 mb-4">All plans include unlimited POS, staff, and branches.</p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Monthly */}
                    <div className="border-2 border-slate-200 hover:border-[#0d1f3c] rounded-xl p-4 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Monthly</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Flexible</span>
                      </div>
                      <p className="text-2xl font-bold text-[#0d1f3c] mb-0.5">
                        ₦{(PLANS.monthly.amount / 100).toLocaleString()}
                        <span className="text-sm font-normal text-slate-400">/mo</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mb-4">Billed every month. Cancel anytime.</p>
                      <ul className="space-y-1.5 mb-4">
                        {['Unlimited products', 'All branches', 'All staff accounts', 'Sales reports'].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                            <i className="fas fa-check text-emerald-500 text-[10px]"></i> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribe('monthly')}
                        disabled={!!initiating}
                        className="w-full py-2.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {initiating === 'monthly'
                          ? <><i className="fas fa-spinner fa-spin"></i> Redirecting…</>
                          : 'Subscribe Monthly'}
                      </button>
                    </div>

                    {/* Yearly */}
                    <div className="border-2 border-blue-500 rounded-xl p-4 relative">
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                          Best value
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Yearly</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">Save ~16%</span>
                      </div>
                      <p className="text-2xl font-bold text-[#0d1f3c] mb-0.5">
                        ₦{(PLANS.annually.amount / 100).toLocaleString()}
                        <span className="text-sm font-normal text-slate-400">/yr</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mb-4">Billed once a year. Best deal.</p>
                      <ul className="space-y-1.5 mb-4">
                        {['Everything in Monthly', 'Priority support', 'Early access to features', 'Annual invoice'].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                            <i className="fas fa-check text-emerald-500 text-[10px]"></i> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribe('annually')}
                        disabled={!!initiating}
                        className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {initiating === 'annually'
                          ? <><i className="fas fa-spinner fa-spin"></i> Redirecting…</>
                          : 'Subscribe Yearly'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Non-admin message */}
              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                  <i className="fas fa-info-circle mr-1.5"></i>
                  Only admins can manage the subscription. Contact your administrator.
                </div>
              )}
            </div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-4">Account details</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Full name', value: profile.full_name },
                    { label: 'Role',      value: profile.role },
                    { label: 'Company',   value: profile.company_id },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-xs font-semibold text-slate-700 capitalize">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-1">Sign out</h2>
                <p className="text-[11px] text-slate-400 mb-4">You'll be redirected to the login page.</p>
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <i className="fas fa-arrow-right-from-bracket text-xs"></i>
                  Sign out
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}