'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = ['Your details', 'Your company', 'Your branch'];

export default function RegisterPage() {
  const router = useRouter();
  const { registerCompany } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 — personal
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — company
  const [companyName, setCompanyName] = useState('');

  // Step 2 — branch
  const [branchName, setBranchName] = useState('');

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) return 'Please enter your full name.';
      if (!email.trim()) return 'Please enter your email.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
    }
    if (step === 1) {
      if (!companyName.trim()) return 'Please enter your company name.';
    }
    if (step === 2) {
      if (!branchName.trim()) return 'Please enter a branch name.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);

    const result = await registerCompany(companyName, branchName, name, email, password);
    if (result) {
      setError(result);
      setLoading(false);
    } else {
      router.push('/pos');
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-[#0d1f3c] flex-col justify-between p-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-store text-white text-sm"></i>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">StoreFlow</span>
        </div>

        {/* Features list */}
        <div className="space-y-6">
          <div>
            <h2 className="text-white text-2xl font-bold leading-snug mb-2">
              Set up your store<br />in under 2 minutes.
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Join hundreds of Nigerian businesses selling smarter with StoreFlow.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { icon: 'fa-bolt', text: 'Fast, intuitive point-of-sale' },
              { icon: 'fa-store', text: 'Multi-branch management' },
              { icon: 'fa-wifi', text: 'Works offline too' },
              { icon: 'fa-shield-halved', text: 'Secure and private' },
              { icon: 'fa-clock', text: '14-day free trial, no card needed' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className={`fas ${f.icon} text-blue-400 text-xs`}></i>
                </div>
                <span className="text-white/70 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <i key={i} className="fas fa-star text-amber-400 text-xs"></i>
            ))}
          </div>
          <p className="text-white/70 text-xs leading-relaxed mb-3">
            "We set up StoreFlow for our 3 branches in one afternoon. Best decision we made."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
              AO
            </div>
            <div>
              <p className="text-white text-[11px] font-semibold">Amara O.</p>
              <p className="text-white/40 text-[10px]">Fashion store, Lagos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 md:p-10">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#0d1f3c] rounded-lg flex items-center justify-center">
            <i className="fas fa-store text-white text-sm"></i>
          </div>
          <span className="font-bold text-[#0d1f3c] text-lg">StoreFlow</span>
        </div>

        <div className="w-full max-w-md">

          {/* Step indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'bg-[#0d1f3c] text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {i < step ? <i className="fas fa-check text-[9px]"></i> : i + 1}
                  </div>
                  <span className={`text-[11px] font-semibold hidden sm:block ${i === step ? 'text-[#0d1f3c]' : 'text-slate-400'}`}>
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 rounded-full transition-all ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">

            {/* Error */}
            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2">
                <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0 text-xs"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>

              {/* ── Step 0: Personal ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl font-bold text-[#0d1f3c]">Create your account</h1>
                    <p className="text-slate-400 text-sm mt-1">Start your free 14-day trial today.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Amara Okafor"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              password.length >= 10 ? 'bg-emerald-400' :
                              password.length >= 6 ? (i < 2 ? 'bg-amber-400' : 'bg-slate-200') :
                              (i < 1 ? 'bg-red-400' : 'bg-slate-200')
                            }`}
                          ></div>
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1">
                          {password.length >= 10 ? 'Strong' : password.length >= 6 ? 'Good' : 'Weak'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 1: Company ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl font-bold text-[#0d1f3c]">About your company</h1>
                    <p className="text-slate-400 text-sm mt-1">This appears on receipts and reports.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Company / Store name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Amara Fashion House"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition text-sm"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-info-circle text-blue-500 text-sm mt-0.5 flex-shrink-0"></i>
                      <div>
                        <p className="text-blue-700 text-xs font-semibold mb-1">You can add more branches later</p>
                        <p className="text-blue-600 text-xs leading-relaxed">
                          We'll set up your first branch in the next step. You can add more from the dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Branch ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl font-bold text-[#0d1f3c]">Your first branch</h1>
                    <p className="text-slate-400 text-sm mt-1">This is the location you'll sell from first.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                      Branch name
                    </label>
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Lagos Island Main Store"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition text-sm"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Summary</p>
                    {[
                      { label: 'Name', value: name },
                      { label: 'Email', value: email },
                      { label: 'Company', value: companyName },
                      { label: 'Branch', value: branchName || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{label}</span>
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                    <i className="fas fa-gift text-emerald-500 text-sm flex-shrink-0"></i>
                    <p className="text-emerald-700 text-xs font-medium">
                      14-day free trial starts now — no credit card needed.
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className={`flex gap-3 mt-7 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none sm:min-w-[140px] flex items-center justify-center gap-2 bg-[#0d1f3c] hover:bg-[#1a3660] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin text-xs"></i> Creating…</>
                  ) : step === 2 ? (
                    <><i className="fas fa-rocket text-xs"></i> Launch my store</>
                  ) : (
                    <>Continue <i className="fas fa-arrow-right text-xs"></i></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0d1f3c] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}