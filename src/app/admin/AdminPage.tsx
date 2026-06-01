'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

// ── Types ─────────────────────────────────────────────
interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// ── FullScreen wrapper (matches DashboardPage) ────────
const FullScreen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-[#f4f6fb]">
    <div className="hidden md:block w-56 bg-[#0d1f3c] flex-shrink-0" />
    <div className="flex-1 flex items-center justify-center p-6">{children}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  // Data state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Hooks ─────────────────────────────────────────
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (profile?.company_id) fetchStaff();
  }, [profile]);

  // ── Auth state listener ───────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ── Functions ─────────────────────────────────────
  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_company_staff', {
      comp_id: profile?.company_id,
    });
    if (!error && data) setStaff(data);
    else console.error('Failed to fetch staff:', error);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, companyId: profile?.company_id }),
    });

    let data;
    try { data = await res.json(); } catch {
      setFormError('Failed to connect to server.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);

    if (!res.ok) {
      setFormError(data.error || 'An unknown error occurred');
    } else {
      setFormSuccess(`Successfully added ${name}!`);
      setName(''); setEmail(''); setPassword(''); setRole('staff');
      fetchStaff();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchStaff();
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

  const userRole = (profile.role || '').toLowerCase();
  if (userRole !== 'admin') return (
    <FullScreen>
      <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 max-w-sm w-full">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-shield-halved text-red-500 text-2xl"></i>
        </div>
        <h1 className="text-lg font-bold text-[#0d1f3c] mb-1">Access denied</h1>
        <p className="text-slate-400 text-sm mb-6">Only administrators can manage staff.</p>
        <button
          onClick={() => router.push('/pos')}
          className="w-full bg-[#0d1f3c] hover:bg-[#1a3660] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>Back to POS
        </button>
      </div>
    </FullScreen>
  );

  // ── Render ────────────────────────────────────────
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
              aria-label="Open menu"
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#0d1f3c] leading-tight">Staff management</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Create users and assign roles</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="grid md:grid-cols-3 gap-5 items-start">

            {/* ── Add Staff Form ── */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#0d1f3c]">Add new staff</h2>
                <div className="w-7 h-7 bg-[#0d1f3c]/5 rounded-lg flex items-center justify-center">
                  <i className="fas fa-user-plus text-[#0d1f3c]/50 text-xs"></i>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="px-5 py-4 space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 flex items-start gap-2">
                    <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-100 flex items-start gap-2">
                    <i className="fas fa-check-circle mt-0.5 flex-shrink-0"></i>
                    <span>{formSuccess}</span>
                  </div>
                )}

                {[
                  { label: 'Full name',     value: name,     setter: setName,     type: 'text'     },
                  { label: 'Email address', value: email,    setter: setEmail,    type: 'email'    },
                  { label: 'Password',      value: password, setter: setPassword, type: 'password' },
                ].map(({ label, value, setter, type }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      {label}
                    </label>
                    <input
                      type={type}
                      required
                      minLength={type === 'password' ? 6 : undefined}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="staff">Staff — cashier access only</option>
                    <option value="admin">Admin — full system access</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !profile?.company_id}
                  className="w-full py-2.5 bg-[#0d1f3c] hover:bg-[#1a3660] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting
                    ? <><i className="fas fa-spinner fa-spin"></i> Creating…</>
                    : <><i className="fas fa-user-plus"></i> Create user</>}
                </button>
              </form>
            </div>

            {/* ── Staff List ── */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#0d1f3c]">Current staff</h2>
                  {!loading && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{staff.length} member{staff.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <button onClick={fetchStaff} title="Refresh"
                  className="p-1.5 text-slate-400 hover:text-[#0d1f3c] hover:bg-slate-100 rounded-lg transition-colors">
                  <i className="fas fa-arrows-rotate text-xs"></i>
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <i className="fas fa-spinner fa-spin text-xl mb-2 block opacity-30"></i>
                  <p className="text-xs">Loading staff…</p>
                </div>
              ) : staff.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <i className="fas fa-users text-3xl mb-2 block opacity-20"></i>
                  <p className="text-xs">No staff members found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['Name', 'Email', 'Role', 'Actions'].map((h, i) => (
                            <th key={h} className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${i === 3 ? 'text-right' : 'text-left'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {staff.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#0d1f3c]/5 flex items-center justify-center text-[10px] font-bold text-[#0d1f3c]/50 flex-shrink-0">
                                  {(s.full_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-slate-700">{s.full_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-400">{s.email}</td>
                            <td className="px-5 py-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${
                                s.role === 'admin'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {s.role}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {s.id !== profile.id ? (
                                <select
                                  value={s.role}
                                  onChange={(e) => handleUpdateRole(s.id, e.target.value)}
                                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                  <option value="staff">Set as staff</option>
                                  <option value="admin">Set as admin</option>
                                </select>
                              ) : (
                                <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-md">
                                  You
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {staff.map((s) => (
                      <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#0d1f3c]/5 flex items-center justify-center text-[11px] font-bold text-[#0d1f3c]/50 flex-shrink-0">
                            {(s.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{s.full_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${
                            s.role === 'admin' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {s.role}
                          </span>
                          {s.id !== profile.id ? (
                            <select
                              value={s.role}
                              onChange={(e) => handleUpdateRole(s.id, e.target.value)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-[10px] bg-white text-slate-600 outline-none"
                            >
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}