'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePosStore } from '@/store/usePosStore';
import { supabase } from '@/lib/supabase';
import POSLayout from '@/components/POSLayout';
import { Branch } from '@/lib/types';

function FullScreenLoader({ message, submessage }: { message: string; submessage?: string }) {
  const [isDark] = useState(true);
  const T = isDark? { bg: '#0d0d0d', bgCard: '#141414', text: '#e8e4dc', textMid: '#888880', accent: '#c9a84c' } : { bg: '#f9f7f4', bgCard: '#ffffff', text: '#1a1612', textMid: '#6b6356', accent: '#a07830' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${T.accent}, ${T.accent}dd)`, display: 'grid', placeItems: 'center', boxShadow: `0 8px 24px ${T.accent}30` }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 0 100 4 2 0 000-4zm-8 2a2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: T.bg, border: `3px solid ${T.bg}`, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, animation: 'pulse 2s infinite' }} />
          </div>
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond", serif', marginBottom: 4 }}>{message}</p>
        {submessage && <p style={{ fontSize: 13, color: T.textMid }}>{submessage}</p>}
      </div>
      <style jsx>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

function FullScreenError({ message, onRetry, onLogout }: { message: string; onRetry?: () => void; onLogout: () => void }) {
  const [isDark] = useState(true);
  const T = isDark? { bg: '#0d0d0d', bgCard: '#141414', border: '#1e1e1e', text: '#e8e4dc', textMid: '#888880', red: '#a84c6b' } : { bg: '#f9f7f4', bgCard: '#ffffff', border: '#e4ddd3', text: '#1a1612', textMid: '#6b6356', red: '#dc2626' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
      <div style={{ background: T.bgCard, padding: 32, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxWidth: 400, width: '100%', textAlign: 'center', border: `1px solid ${T.border}` }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16, background: `${T.red}15`, display: 'grid', placeItems: 'center' }}>
          <svg width="28" height="28" fill="none" stroke={T.red} strokeWidth="2" viewBox="0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: '"Cormorant Garamond", serif' }}>Something went wrong</h2>
        <p style={{ color: T.textMid, marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {onRetry && <button onClick={onRetry} style={{ width: '100%', padding: '12px', background: T.bgCard, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Try Again</button>}
          <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: T.text, color: T.bg, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function BranchSelectionScreen({ branches, onSelect, onLogout }: { branches: Branch[]; onSelect: (id: string) => void; onLogout: () => void }) {
  const [isDark] = useState(true);
  const T = isDark? { bg: '#0d0d0d', bgCard: '#141414', bgHover: '#1a1a1a', border: '#1e1e', text: '#e8e4dc', textMid: '#888880', textMute: '#555550', accent: '#c9a84c', amber: '#a87c4f' } : { bg: '#f9f7f4', bgCard: '#ffffff', bgHover: '#f0ebe3', border: '#e4ddd3', text: '#1a1612', textMid: '#6b6356', textMute: '#b0a99e', accent: '#a07830', amber: '#d97706' };

  if (branches.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
        <div style={{ background: T.bgCard, padding: 32, borderRadius: 16, maxWidth: 400, width: '100%', textAlign: 'center', border: `1px solid ${T.border}` }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16, background: `${T.amber}15`, display: 'grid', placeItems: 'center' }}>
            <svg width="28" height="28" fill="none" stroke={T.amber} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: '"Cormorant Garamond", serif' }}>No Branches Found</h2>
          <p style={{ color: T.textMid, marginBottom: 24, fontSize: 14 }}>Contact your administrator to get branch access.</p>
          <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: T.text, color: T.bg, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
      <div style={{ background: T.bgCard, padding: 32, borderRadius: 16, maxWidth: 520, width: '100%', border: `1px solid ${T.border}`, boxShadow: '0 20px 40px rgba(0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16, background: `${T.accent}15`, display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" fill="none" stroke={T.accent} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond", serif', marginBottom: 4 }}>Select Branch</h2>
          <p style={{ color: T.textMid, fontSize: 14 }}>Where are you working today?</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {branches.map((branch) => (
            <button key={branch.id} onClick={() => onSelect(branch.id)} style={{ padding: 20, border: `1px solid ${T.border}`, borderRadius: 12, background: T.bgCard, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.bgHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bgCard; }}>
              <svg width="20" height="20" fill="none" stroke={T.textMute} strokeWidth="2" viewBox="0 24 24" style={{ marginBottom: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <p style={{ fontWeight: 600, color: T.text, fontSize: 15, marginBottom: 4, lineHeight: 1.2 }}>{branch.name}</p>
              {'location' in branch && <p style={{ fontSize: 12, color: T.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(branch as any).location}</p>}
            </button>
          ))}
        </div>

        <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: T.textMid, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4m4 4H7m6 4v1a3 0 01-3 3H6a3 0 01-3-3V7a3 3 0 013-3h4a3 0 013 3v1"/></svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function POSPage() {
  const router = useRouter();
  const hasFetchedProducts = useRef(false);

  const { user, branches, activeBranchId, isLoading, profileError, fetchProfile, logout, setActiveBranch } = useAuthStore();
  const { products, fetchProducts, isLoadingProducts, productsError } = usePosStore();

  const hasCachedProducts = products.length > 0;

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (!isLoading &&!user) router.push('/login'); }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const checkSub = async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;
      const { data: company } = await supabase.from('companies').select('subscription_status, trial_ends_at, subscription_ends_at').eq('id', profile.company_id).single();
      if (!company) return;
      const now = new Date();
      const trialExpired = company.subscription_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at) < now;
      const subExpired = company.subscription_status === 'expired' || (company.subscription_status === 'active' && company.subscription_ends_at && new Date(company.subscription_ends_at) < now);
      if (trialExpired || subExpired) router.replace('/settings?tab=billing&reason=expired');
    };
    checkSub();
  }, [user, router]);

  useEffect(() => { if (user && branches.length === 1 &&!activeBranchId) setActiveBranch(branches[0].id); }, [user, branches, activeBranchId, setActiveBranch]);
  useEffect(() => { if (user && activeBranchId &&!hasFetchedProducts.current) { hasFetchedProducts.current = true; fetchProducts(activeBranchId); } }, [user, activeBranchId, fetchProducts]);

  const handleRetryProfile = useCallback(() => { fetchProfile(); }, [fetchProfile]);
  const handleRetryProducts = useCallback(() => { if (activeBranchId) { hasFetchedProducts.current = false; fetchProducts(activeBranchId); } }, [activeBranchId, fetchProducts]);

  if (isLoading ||!user) return <FullScreenLoader message={hasCachedProducts? 'Almost ready…' : 'Preparing session…'} submessage="Verifying credentials" />;
  if (profileError) return <FullScreenError message={profileError} onRetry={handleRetryProfile} onLogout={logout} />;
  if (!activeBranchId) return <BranchSelectionScreen branches={branches} onSelect={setActiveBranch} onLogout={logout} />;
  if (productsError &&!hasCachedProducts) return <FullScreenError message={productsError} onRetry={handleRetryProducts} onLogout={logout} />;
  if (isLoadingProducts &&!hasCachedProducts) return <FullScreenLoader message="Syncing Branch…" submessage="Loading products & inventory" />;

  return <POSLayout />;
}