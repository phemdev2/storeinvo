'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';

const DARK = {
  bg: '#0c0c0c', bgCard: '#131313', bgDeep: '#090909', bgHover: '#1a',
  border: '#1f', text: '#e9e5dd', textMid: '#8a8680', textMute: '#525050',
  accent: '#c9a84c', accentText: '#0c', green: '#7c9a8c', amber: '#a87c4f', red: '#a84c6b', blue: '#6b8caf',
} as const;

const LIGHT = {
  bg: '#f8f6f2', bgCard: '#ffffff', bgDeep: '#f1ece5', bgHover: '#ede8e0',
  border: '#e2dbd1', text: '#1a1612', textMid: '#6a6256', textMute: '#aea79c',
  accent: '#9f7830', accentText: '#ffffff', green: '#059669', amber: '#d97706', red: '#dc2626', blue: '#2563eb',
} as const;

type Theme = typeof DARK | typeof LIGHT;
const STEPS = ['Your details', 'Your company', 'Your branch'];

export default function RegisterPage() {
  const router = useRouter();
  const { registerCompany } = useAuthStore();

  const [isDark, setIsDark] = useState(true);
  const T = useMemo<Theme>(() => (isDark? DARK : LIGHT), [isDark]);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [branchName, setBranchName] = useState('');

  // ✅ FIX: window only in useEffect (client-side)
  useEffect(() => {
    const saved = localStorage.getItem('nm-theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else if (typeof window!== 'undefined') {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (typeof window!== 'undefined') {
      localStorage.setItem('nm-theme', isDark? 'dark' : 'light');
    }
  }, [isDark]);

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) return 'Please enter your full name.';
      if (!email.trim()) return 'Please enter your email.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
    }
    if (step === 1 &&!companyName.trim()) return 'Please enter your company name.';
    if (step === 2 &&!branchName.trim()) return 'Please enter a branch name.';
    return null;
  };

  const handleNext = () => { const err = validateStep(); if (err) return setError(err); setError(null); setStep(s => s + 1); };
  const handleBack = () => { setError(null); setStep(s => s - 1); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(); if (err) return setError(err);
    setError(null); setLoading(true);
    const result = await registerCompany(companyName, branchName, name, email, password);
    if (result) { setError(result); setLoading(false); } else { router.push('/pos'); }
  };

  const globalCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
    * { box-sizing: border-box; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) {.hide-mobile { display: none!important; } }
  `;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', background: T.bgDeep, border: `1px solid ${T.border}`,
    borderRadius: 12, color: T.text, fontSize: 14, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', fontFamily: '"DM Sans", sans-serif', color: T.text }}>
      <style>{globalCSS}</style>

      <div className="hidden lg:flex" style={{ width: 420, flexShrink: 0, background: isDark? T.bgCard : '#0d1f3c', flexDirection: 'column', justifyContent: 'space-between', padding: 40, borderRight: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, #a87c4f)`, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700, color: T.accentText }}>N</span>
          </div>
          <span style={{ color: isDark? T.text : 'white', fontWeight: 700, fontSize: 18 }}>NovaMart</span>
        </div>
        <div>
          <h2 style={{ color: isDark? T.text : 'white', fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 8, fontFamily: '"Cormorant Garamond", serif' }}>Set up your store<br/>in under 2 minutes.</h2>
          <p style={{ color: T.textMid, fontSize: 14 }}>Join hundreds of Nigerian businesses selling smarter.</p>
        </div>
        <div style={{ background: `${T.accent}0f`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
          <p style={{ color: T.textMid, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>"We set up NovaMart for 3 branches in one afternoon."</p>
          <div style={{ fontSize: 11, color: T.textMute }}>— Amara O., Fashion store, Lagos</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
        <button onClick={() => setIsDark(v =>!v)} type="button" style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, color: T.textMid, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          {isDark? '☀' : '🌙'}
        </button>

        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, background: i < step? T.green : i === step? T.accent : T.bgDeep, color: i <= step? T.accentText : T.textMute, border: `1px solid ${i === step? T.accent : T.border}` }}>
                  {i < step? '✓' : i + 1}
                </div>
                {/* ✅ FIXED: removed window.innerWidth, using CSS class instead */}
                <span className="hide-mobile" style={{ fontSize: 12, color: i === step? T.text : T.textMute }}>{s}</span>
                {i < 2 && <div style={{ flex: 1, height: 2, background: i < step? T.green : T.border, margin: '0 8px', borderRadius: 2 }} />}
              </div>
            ))}
          </div>

          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28 }}>
            {error && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: `${T.red}14`, border: `1px solid ${T.red}30`, color: T.red, borderRadius: 10, fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={step === 2? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif', margin: 0, color: T.text }}>Create your account</h1>
                    <p style={{ color: T.textMid, fontSize: 13, marginTop: 4 }}>Start your free 14-day trial.</p>
                  </div>
                  <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: T.textMute }}>Full name</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oyeniyi Oluwafemi" /></div>
                  <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: T.textMute }}>Email</label><input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                  <div>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: T.textMute }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword? 'text' : 'password'} style={{...inputStyle, paddingRight: 40 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.textMute, cursor: 'pointer' }}>{showPassword? '🙈' : '👁️'}</button>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif', margin: 0, color: T.text }}>About your company</h1>
                    <p style={{ color: T.textMid, fontSize: 13, marginTop: 4 }}>This appears on receipts.</p>
                  </div>
                  <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: T.textMute }}>Company / Store name</label><input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. NovaMart Lagos" /></div>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif', margin: 0, color: T.text }}>Your first branch</h1>
                    <p style={{ color: T.textMid, fontSize: 13, marginTop: 4 }}>You can add more later.</p>
                  </div>
                  <div><label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: T.textMute }}>Branch name</label><input style={inputStyle} value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. Ikeja Main" /></div>
                  <div style={{ background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: T.textMute }}>Name</span><span style={{ color: T.text }}>{name}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: T.textMute }}>Company</span><span style={{ color: T.text }}>{companyName}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.textMute }}>Branch</span><span style={{ color: T.text }}>{branchName || '—'}</span></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: step > 0? 'space-between' : 'flex-end' }}>
                {step > 0 && <button type="button" onClick={handleBack} style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 10, cursor: 'pointer' }}>Back</button>}
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: T.accent, color: T.accentText, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', opacity: loading? 0.6 : 1 }}>
                  {loading? 'Creating…' : step === 2? 'Launch my store' : 'Continue'}
                </button>
              </div>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: T.textMute, marginTop: 16 }}>
            Already have an account? <Link href="/login" style={{ color: T.accent, fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}