'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: 'fa-cash-register',
    title: 'Lightning-fast POS',
    desc: 'Ring up sales in seconds. Barcode scanning, variant products, and custom pricing built in.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: 'fa-layer-group',
    title: 'Multi-branch support',
    desc: 'Manage multiple store locations from one dashboard. Each branch, its own inventory.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: 'fa-users',
    title: 'Staff & roles',
    desc: 'Create cashier accounts with limited access. Admins see everything, staff see what they need.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: 'fa-chart-bar',
    title: 'Real-time analytics',
    desc: 'Track sales by branch, cashier, and payment method. Daily, weekly, and monthly reports.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: 'fa-wifi',
    title: 'Offline-ready',
    desc: 'Keep selling even without internet. Orders sync automatically when you reconnect.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: 'fa-receipt',
    title: 'Smart receipts',
    desc: 'Digital receipts with order history. Refunds and invoice lookup in one click.',
    color: 'bg-rose-50 text-rose-600',
  },
];

const PLANS = [
  {
    name: 'Free Trial',
    price: '₦0',
    period: '14 days',
    desc: 'Full access, no credit card required.',
    features: ['All POS features', 'Up to 2 branches', 'Up to 5 staff', 'Basic reports'],
    cta: 'Start free trial',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Monthly',
    price: '₦100',
    period: '/month',
    desc: 'Flexible. Cancel anytime.',
    features: ['Unlimited products', 'All branches', 'All staff accounts', 'Full analytics', 'Priority support'],
    cta: 'Get started',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Yearly',
    price: '₦990',
    period: '/year',
    desc: 'Save ~16% vs monthly.',
    features: ['Everything in Monthly', 'Early access to features', 'Annual invoice', 'Dedicated support'],
    cta: 'Best value',
    href: '/register',
    highlight: true,
  },
];

const TESTIMONIALS = [
  {
    name: 'Amara O.',
    role: 'Fashion store owner, Lagos',
    text: 'We went from pen-and-paper to full digital in one afternoon. The multi-branch feature alone saved us hours every week.',
    avatar: 'AO',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    name: 'Chidi N.',
    role: 'Restaurant manager, Abuja',
    text: 'The offline mode is a lifesaver. We never miss a sale even when NEPA takes the light and internet goes down.',
    avatar: 'CN',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Fatima B.',
    role: 'Supermarket owner, Kano',
    text: 'My cashiers learned it in 10 minutes. The dashboard gives me everything I need to manage 3 branches remotely.',
    avatar: 'FB',
    color: 'bg-amber-100 text-amber-700',
  },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">

      {/* ── Nav ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0d1f3c] rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="fas fa-store text-white text-sm"></i>
            </div>
            <span className="font-bold text-[#0d1f3c] text-lg tracking-tight">StoreFlow</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-slate-500 hover:text-[#0d1f3c] transition-colors font-medium">
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-[#0d1f3c] transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-[#0d1f3c] hover:bg-[#1a3660] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Start free trial
            </Link>
          </div>

          {/* Mobile menu btn */}
          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-slate-600 font-medium py-1"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="text-center text-sm font-semibold text-slate-600 py-2 border border-slate-200 rounded-xl">
                Sign in
              </Link>
              <Link href="/register" className="text-center bg-[#0d1f3c] text-white text-sm font-semibold py-2.5 rounded-xl">
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-5 md:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <i className="fas fa-bolt text-[10px]"></i>
            Built for Nigerian businesses
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-[#0d1f3c] leading-tight mb-6 tracking-tight">
            The POS that runs
            <br />
            <span className="text-blue-600">your entire store</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sell faster, track smarter, manage better. StoreFlow gives small businesses a powerful point-of-sale system that works online and offline.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-[#0d1f3c] hover:bg-[#1a3660] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              Start free for 14 days
              <i className="fas fa-arrow-right text-xs"></i>
            </Link>
            <Link
              href="/login"
              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            No credit card required · Cancel anytime · Setup in minutes
          </p>

          {/* Hero mockup */}
          <div className="mt-16 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-w-3xl mx-auto">
            <div className="bg-[#0d1f3c] px-4 py-3 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              <span className="text-white/40 text-xs ml-2 font-mono">storeflow.app/pos</span>
            </div>
            <div className="p-5 bg-slate-50 grid grid-cols-3 gap-3">
              {['Ankara Fabric', 'Hair Cream', 'Phone Case', 'Sneakers', 'Face Powder', 'Perfume'].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 text-left">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-2">
                    <i className="fas fa-box text-purple-500 text-xs"></i>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 truncate">{item}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">₦{(Math.random() * 10000 + 500).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '10,000+', label: 'Transactions daily' },
            { value: '500+', label: 'Active businesses' },
            { value: '99.9%', label: 'Uptime' },
            { value: '< 2min', label: 'Setup time' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl md:text-3xl font-bold text-[#0d1f3c]">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1f3c] mb-4">Everything you need to run your store</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From the sales floor to the back office, StoreFlow has you covered.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <i className={`fas ${f.icon} text-sm`}></i>
                </div>
                <h3 className="font-bold text-[#0d1f3c] mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 md:py-28 px-5 md:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1f3c] mb-4">Up and running in minutes</h2>
            <p className="text-slate-500">No technical skills required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: 'fa-user-plus', title: 'Create your account', desc: 'Sign up with your email, set up your company and first branch.' },
              { step: '02', icon: 'fa-box-open', title: 'Add your products', desc: 'Import your inventory, set prices, and add variants and barcodes.' },
              { step: '03', icon: 'fa-cash-register', title: 'Start selling', desc: 'Open the POS, add items to cart, collect payment. That simple.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-black text-slate-100">{s.step}</span>
                    <div className="w-9 h-9 bg-[#0d1f3c] rounded-xl flex items-center justify-center">
                      <i className={`fas ${s.icon} text-white text-xs`}></i>
                    </div>
                  </div>
                  <h3 className="font-bold text-[#0d1f3c] mb-2 text-sm">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1f3c] mb-4">Simple, honest pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border relative ${
                  plan.highlight
                    ? 'bg-[#0d1f3c] border-[#0d1f3c] text-white'
                    : 'bg-white border-slate-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Best value
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? 'text-white/60' : 'text-slate-400'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-[#0d1f3c]'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-slate-400'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.highlight ? 'text-white/60' : 'text-slate-400'}`}>
                    {plan.desc}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <i className={`fas fa-check text-[10px] ${plan.highlight ? 'text-emerald-400' : 'text-emerald-500'}`}></i>
                      <span className={plan.highlight ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-[#0d1f3c] hover:bg-slate-100'
                      : 'bg-[#0d1f3c] text-white hover:bg-[#1a3660]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 md:py-28 px-5 md:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d1f3c] mb-4">Loved by store owners</h2>
            <p className="text-slate-500">Real businesses, real results.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star text-amber-400 text-xs"></i>
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0d1f3c]">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28 px-5 md:px-8 bg-[#0d1f3c]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to modernise your store?</h2>
          <p className="text-white/60 mb-8 text-lg">Join hundreds of Nigerian businesses already using StoreFlow.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#0d1f3c] font-bold px-8 py-4 rounded-xl transition-colors text-sm"
          >
            Start your free 14-day trial
            <i className="fas fa-arrow-right text-xs"></i>
          </Link>
          <p className="text-white/40 text-xs mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#080f1e] py-12 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-store text-white text-xs"></i>
                </div>
                <span className="font-bold text-white text-base">StoreFlow</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                A modern point-of-sale system built for Nigerian retail businesses.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                {
                  heading: 'Product',
                  links: ['Features', 'Pricing', 'Changelog'],
                },
                {
                  heading: 'Company',
                  links: ['About', 'Contact', 'Privacy'],
                },
                {
                  heading: 'Account',
                  links: ['Sign in', 'Register', 'Settings'],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3">{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l}>
                        <a href="#" className="text-white/50 hover:text-white text-sm transition-colors">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-white/30 text-xs">© 2026 StoreFlow. All rights reserved.</p>
            <p className="text-white/20 text-xs">Built for Nigerian businesses 🇳🇬</p>
          </div>
        </div>
      </footer>
    </div>
  );
}