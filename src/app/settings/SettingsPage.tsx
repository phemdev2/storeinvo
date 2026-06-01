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

const PLANS = {
  monthly:  { code: 'PLN_f9ot8hc6p0f4bcq', amount: 10000,  label: 'Monthly', period: '/mo' },
  annually: { code: 'PLN_annually_xxx',      amount: 99000, label: 'Yearly',  period: '/yr' },
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'storeflow.app';

interface Subscription {
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  slug: string | null;
  custom_domain: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  receipt_footer: string | null;
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

type Tab = 'store' | 'billing' | 'account' | 'domain';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'store',   label: 'Store',   icon: 'fa-store'       },
  { key: 'billing', label: 'Billing', icon: 'fa-credit-card' },
  { key: 'account', label: 'Account', icon: 'fa-user'        },
  { key: 'domain',  label: 'Domain',  icon: 'fa-globe'       },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, fetchProfile, logout } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [initiating, setInitiating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Store details state
  const [storeName, setStoreName]       = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone]     = useState('');
  const [storeFooter, setStoreFooter]   = useState('');
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMsg, setStoreMsg]         = useState('');
  const [storeError, setStoreError]     = useState('');

  // Domain state
  const [companySlug, setCompanySlug]     = useState('');
  const [customDomain, setCustomDomain]   = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainMsg, setDomainMsg]         = useState('');
  const [domainError, setDomainError]     = useState('');

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (searchParams.get('status') === 'success') setSuccessMsg('🎉 Payment successful! Your subscription is being activated.');
    if (searchParams.get('tab') === 'billing') setActiveTab('billing');
    if (searchParams.get('reason') === 'expired') { setActiveTab('billing'); setSuccessMsg(''); }
  }, [searchParams]);

  useEffect(() => {
    const fetchSub = async () => {
      if (!profile?.company_id) return;
      setLoadingSub(true);
      const { data } = await supabase
        .from('companies')
        .select('subscription_status, subscription_plan, trial_ends_at, subscription_ends_at, slug, custom_domain, name, address, phone, receipt_footer')
        .eq('id', profile.company_id)
        .single();
      setSub(data);
      setCompanySlug(data?.slug || '');
      setCustomDomain(data?.custom_domain || '');
      setStoreName(data?.name || '');
      setStoreAddress(data?.address || '');
      setStorePhone(data?.phone || '');
      setStoreFooter(data?.receipt_footer || '');
      setLoadingSub(false);
    };
    fetchSub();
  }, [profile?.company_id]);

  const handleSaveStore = async () => {
    if (!profile?.company_id) return;
    setStoreLoading(true);
    setStoreMsg('');
    setStoreError('');
    const { error } = await supabase
      .from('companies')
      .update({
        name: storeName.trim(),
        address: storeAddress.trim(),
        phone: storePhone.trim(),
        receipt_footer: storeFooter.trim() || null,
      })
      .eq('id', profile.company_id);
    setStoreLoading(false);
    if (error) setStoreError(error.message);
    else setStoreMsg('Store details saved successfully!');
  };

  const handleSubscribe = async (planKey: 'monthly' | 'annually') => {
    if (!profile) return;
    setInitiating(planKey);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInitiating(null); return; }
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, plan: PLANS[planKey].code, companyId: profile.company_id }),
    });
    const data = await res.json();
    setInitiating(null);
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Failed to initialize payment');
  };

  const handleSaveDomain = async () => {
    if (!profile?.company_id) return;
    setDomainLoading(true); setDomainMsg(''); setDomainError('');
    const { error } = await supabase
      .from('companies')
      .update({ custom_domain: customDomain.trim() || null })
      .eq('id', profile.company_id);
    setDomainLoading(false);
    if (error) setDomainError(error.message);
    else setDomainMsg('Custom domain saved!');
  };

  // Fixed: Actually logs the user out instead of just redirecting
  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
            {/* Fixed: Use handleLogout instead of router.push */}
            <button
              onClick={handleLogout}
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
              <p className="text-[11px] text-slate-400 leading-tight">Manage your store & subscription</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-xl p-1 w-fit flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  activeTab === tab.key ? 'bg-[#0d1f3c] text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <i className={`fas ${tab.icon} mr-1.5`}></i>{tab.label}
              </button>
            ))}
          </div>

          {/* ── STORE TAB ── */}
          {activeTab === 'store' && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0d1f3c]">Store details</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Shown on printed receipts</p>
                  </div>
                  <div className="w-8 h-8 bg-[#0d1f3c]/5 rounded-lg flex items-center justify-center">
                    <i className="fas fa-store text-[#0d1f3c]/50 text-sm"></i>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {storeError && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 flex items-start gap-2">
                      <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
                      <span>{storeError}</span>
                    </div>
                  )}
                  {storeMsg && (
                    <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-100 flex items-start gap-2">
                      <i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i>
                      <span>{storeMsg}</span>
                    </div>
                  )}

                  {[
                    { label: 'Store name',   value: storeName,    setter: setStoreName,    placeholder: 'My Store',               icon: 'fa-store'        },
                    { label: 'Address',      value: storeAddress, setter: setStoreAddress, placeholder: '123 Main Street, Lagos',  icon: 'fa-location-dot' },
                    { label: 'Phone number', value: storePhone,   setter: setStorePhone,   placeholder: '08012345678',             icon: 'fa-phone'        },
                  ].map(({ label, value, setter, placeholder, icon }) => (
                    <div key={label}>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
                      <div className="relative">
                        <i className={`fas ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs`}></i>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => { setter(e.target.value); setStoreMsg(''); setStoreError(''); }}
                          placeholder={placeholder}
                          disabled={!isAdmin}
                          className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Receipt footer message
                    </label>
                    <div className="relative">
                      <i className="fas fa-message absolute left-3 top-3 text-slate-300 text-xs"></i>
                      <textarea
                        value={storeFooter}
                        onChange={(e) => { setStoreFooter(e.target.value); setStoreMsg(''); setStoreError(''); }}
                        placeholder="e.g. Goods sold are not refundable"
                        rows={2}
                        disabled={!isAdmin}
                        className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-400 resize-none"
                      />
                    </div>
                  </div>

                  {!isAdmin && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <i className="fas fa-info-circle mr-1.5"></i>Only admins can edit store details.
                    </p>
                  )}

                  {isAdmin && (
                    <button
                      onClick={handleSaveStore}
                      disabled={storeLoading}
                      className="w-full py-2.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {storeLoading
                        ? <><i className="fas fa-spinner fa-spin"></i> Saving…</>
                        : <><i className="fas fa-floppy-disk"></i> Save store details</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Receipt preview */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-[#0d1f3c]">Receipt preview</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">How your header will look on printed receipts</p>
                </div>
                <div className="px-5 py-4 flex justify-center">
                  <div className="font-mono text-center text-[12px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-6 py-4 w-full max-w-xs">
                    <p className="font-bold text-base uppercase tracking-wide">{storeName || 'My Store'}</p>
                    {storeAddress && <p className="text-[10px] text-slate-400 mt-1">{storeAddress}</p>}
                    {storePhone   && <p className="text-[10px] text-slate-400">Tel: {storePhone}</p>}
                    <div className="border-b border-dashed border-slate-300 my-2"></div>
                    <p className="text-[10px] text-slate-300">— items appear below —</p>
                    <div className="border-b border-dashed border-slate-300 my-2"></div>
                    {storeFooter && <p className="text-[10px] text-slate-400 italic mt-2">{storeFooter}</p>}
                    <p className="font-bold text-[10px] text-slate-500 mt-2">Thank you for your patronage!</p>
                  </div>
                </div>
              </div>

              {/* Storefront link */}
              {companySlug && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0d1f3c]">Online storefront</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Your public shop where customers can order online</p>
                  </div>
                  {/* FIX: Added the missing <a> tag declaration */}
                  <a
                    href={`/store/${companySlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                  >
                    <i className="fas fa-shopping-bag text-[10px]"></i> Open Store
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── BILLING TAB ── */}
          {activeTab === 'billing' && (
            <div className="space-y-4 max-w-2xl">
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">{successMsg}</div>
              )}
              {searchParams.get('reason') === 'expired' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
                  <i className="fas fa-lock mt-0.5 flex-shrink-0"></i>
                  <div>
                    <p className="font-semibold mb-1">Your access has been restricted</p>
                    <p className="text-xs text-red-600">Your trial or subscription has expired. Subscribe below to restore full access.</p>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-4">Current subscription</h2>
                {loadingSub ? (
                  <div className="text-slate-400 text-xs"><i className="fas fa-spinner fa-spin mr-2"></i>Loading…</div>
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
                          <span className="text-xs font-semibold text-slate-700 capitalize">{sub.subscription_plan || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Renews</span>
                          <span className="text-xs font-semibold text-slate-700">{formatDate(sub.subscription_ends_at)}</span>
                        </div>
                      </>
                    )}
                    {sub.subscription_status === 'expired' && (
                      <p className="text-xs text-red-500">Your subscription has expired. Choose a plan below to reactivate.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No subscription data found.</p>
                )}
              </div>

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
                        {initiating === 'monthly' ? <><i className="fas fa-spinner fa-spin"></i> Redirecting…</> : 'Subscribe Monthly'}
                      </button>
                    </div>

                    {/* Yearly */}
                    <div className="border-2 border-blue-500 rounded-xl p-4 relative">
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">Best value</span>
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
                        {initiating === 'annually' ? <><i className="fas fa-spinner fa-spin"></i> Redirecting…</> : 'Subscribe Yearly'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                  <i className="fas fa-info-circle mr-1.5"></i>Only admins can manage the subscription.
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
                {/* Fixed: Use handleLogout instead of router.push */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <i className="fas fa-arrow-right-from-bracket text-xs"></i> Sign out
                </button>
              </div>
            </div>
          )}

          {/* ── DOMAIN TAB ── */}
          {activeTab === 'domain' && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-1">Your subdomain</h2>
                <p className="text-[11px] text-slate-400 mb-4">Your store is accessible at this URL automatically.</p>
                {companySlug ? (
                  <>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                      <i className="fas fa-link text-slate-400 text-xs"></i>
                      <span className="text-sm font-mono text-[#0d1f3c] font-semibold flex-1 truncate">{companySlug}.{ROOT_DOMAIN}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(`https://${companySlug}.${ROOT_DOMAIN}`)}
                        className="text-slate-400 hover:text-[#0d1f3c] transition-colors flex-shrink-0"
                        title="Copy URL"
                      >
                        <i className="fas fa-copy text-xs"></i>
                      </button>
                    </div>
                    <div className="mt-3 flex gap-4">
                      <a href={`https://${companySlug}.${ROOT_DOMAIN}/pos`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <i className="fas fa-cash-register text-[10px]"></i> Open POS
                      </a>
                      <a href={`https://${companySlug}.${ROOT_DOMAIN}/dashboard`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <i className="fas fa-gauge-high text-[10px]"></i> Open Dashboard
                      </a>
                      <a href={`/store/${companySlug}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <i className="fas fa-shopping-bag text-[10px]"></i> Open Store
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No subdomain assigned yet.</p>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#0d1f3c] mb-1">Custom domain</h2>
                <p className="text-[11px] text-slate-400 mb-4">Point your own domain to your StoreFlow store.</p>
                {domainError && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{domainError}</div>}
                {domainMsg  && <div className="mb-3 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{domainMsg}</div>}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="pos.yourdomain.com"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveDomain}
                    disabled={domainLoading || !isAdmin}
                    className="bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {domainLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2"><i className="fas fa-info-circle mr-1.5"></i>DNS setup required</p>
                  <p className="text-[11px] text-amber-700 mb-3">Add this CNAME record to your domain's DNS settings:</p>
                  <div className="bg-white border border-amber-200 rounded-lg p-3 font-mono text-[11px] space-y-1.5">
                    {[
                      { key: 'Type',  val: 'CNAME' },
                      { key: 'Name',  val: customDomain.split('.')[0] || 'pos' },
                      { key: 'Value', val: 'cname.vercel-dns.com' },
                      { key: 'TTL',   val: 'Auto' },
                    ].map(({ key, val }) => (
                      <div key={key} className="flex gap-4">
                        <span className="text-slate-400 w-14">{key}</span>
                        <span className="text-slate-700 font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2">DNS changes can take up to 48 hours to propagate.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}