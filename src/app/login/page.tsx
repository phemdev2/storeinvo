'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

// ─── Theme (same as dashboard) ───────────────────────────────────────────────
const DARK = {
  bg: '#0c0c0c', bgCard: '#131313', bgDeep: '#090909', border: '#1f1f1f',
  text: '#e9e5dd', textMid: '#8a8680', textMute: '#525050',
  accent: '#c9a84c', accentText: '#0c0c0c', red: '#a84c6b',
} as const;

const LIGHT = {
  bg: '#f8f6f2', bgCard: '#ffffff', bgDeep: '#f1ece5', border: '#e2dbd1',
  text: '#1a1612', textMid: '#6a6256', textMute: '#aea79c',
  accent: '#9f7830', accentText: '#ffffff', red: '#dc2626',
} as const;

type Theme = {
  readonly bg: string;
  readonly bgCard: string;
  readonly bgDeep: string;
  readonly border: string;
  readonly text: string;
  readonly textMid: string;
  readonly textMute: string;
  readonly accent: string;
  readonly accentText: string;
  readonly red: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, logout } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const T = useMemo<Theme>(() => (isDark? DARK : LIGHT), [isDark]);

  // ── Theme persistence ──
  useEffect(() => {
    const saved = localStorage.getItem('nm-theme');
    setIsDark(saved? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => {
    localStorage.setItem('nm-theme', isDark? 'dark' : 'light');
  }, [isDark]);

  // ── Clear any active session ──
  useEffect(() => {
    const clearSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoggingOut(true);
        await logout();
        setLoggingOut(false);
      }
    };
    clearSession();
  }, [logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await login(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const globalCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  if (loggingOut) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.bg, color: T.textMid, fontFamily: '"DM Sans", sans-serif' }}>
        <style>{globalCSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Signing out…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16, fontFamily: '"DM Sans", sans-serif', position: 'relative' }}>
      <style>{globalCSS}</style>

      {/* Theme toggle */}
      <button
        onClick={() => setIsDark(v =>!v)}
        type="button"
        aria-label="Toggle theme"
        style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, color: T.textMid, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
      >
        {isDark? '☀' : '🌙'}
      </button>

      <div style={{ width: '100%', maxWidth: 400, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.accent}, #a87c4f)`, display: 'grid', placeItems: 'center', marginBottom: 16, boxShadow: `0 8px 20px ${T.accent}30` }}>
            <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, fontWeight: 700, color: T.accentText }}>N</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond", serif', margin: 0 }}>Welcome back</h2>
          <p style={{ color: T.textMid, fontSize: 14, marginTop: 4 }}>Sign in to NovaMart POS</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, padding: '12px 14px', background: `${T.red}14`, border: `1px solid ${T.red}30`, color: T.red, borderRadius: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.textMid, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '11px 14px', background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = T.accent}
              onBlur={e => e.currentTarget.style.borderColor = T.border}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.textMid, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = T.accent}
              onBlur={e => e.currentTarget.style.borderColor = T.border}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading? T.textMute : T.accent, color: T.accentText, fontWeight: 600, borderRadius: 12, border: 'none', cursor: loading? 'default' : 'pointer', marginTop: 8, fontSize: 15, transition: 'opacity 0.2s' }}
          >
            {loading? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13, textAlign: 'center', color: T.textMute }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: T.accent, fontWeight: 600, textDecoration: 'none' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}