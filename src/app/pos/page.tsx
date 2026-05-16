'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePosStore } from '@/store/usePosStore';
import POSLayout from '@/components/POSLayout';
import { Branch } from '@/lib/types';

// --- Sub-Components ---

function FullScreenLoader({
  message,
  submessage,
}: {
  message: string;
  submessage?: string;
}) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <i className="fas fa-cash-register text-white text-2xl" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-slate-100 bg-purple-500 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">{message}</p>
          {submessage && (
            <p className="text-sm text-slate-400 mt-1">{submessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FullScreenError({
  message,
  onRetry,
  onLogout,
}: {
  message: string;
  onRetry?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <i className="fas fa-triangle-exclamation text-red-500 text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-slate-500 mb-6 text-sm">{message}</p>
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchSelectionScreen({
  branches,
  onSelect,
  onLogout,
}: {
  branches: Branch[];
  onSelect: (id: string) => void;
  onLogout: () => void;
}) {
  if (branches.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <i className="fas fa-store-slash text-amber-500 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Branches Found</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Contact your administrator to get branch access.
          </p>
          <button
            onClick={onLogout}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
            <i className="fas fa-building text-purple-600 text-xl" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Select Branch</h2>
          <p className="text-slate-400 text-sm mt-1">
            Where are you working today?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => onSelect(branch.id)}
              className="group relative p-5 border-2 border-slate-100 rounded-xl hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left"
            >
              <i className="fas fa-store text-slate-300 group-hover:text-purple-500 transition-colors text-lg mb-3 block" />
              <p className="font-bold text-slate-700 group-hover:text-purple-700 transition-colors leading-tight">
                {branch.name}
              </p>
              {'location' in branch && (
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {branch.location}
                </p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="mt-6 w-full py-3 text-sm text-slate-400 hover:text-red-500 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <i className="fas fa-arrow-right-from-bracket text-xs" />
          Sign out
        </button>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function POSPage() {
  const router = useRouter();

  const {
    user,
    branches,
    activeBranchId,
    isLoading,
    profileError,    // ✅ NEW: expose error from auth store
    fetchProfile,
    logout,
    setActiveBranch,
  } = useAuthStore();

  const {
    products,
    fetchProducts,
    isLoadingProducts,
    productsError,    // ✅ NEW: expose error from POS store
  } = usePosStore();

  // ── Fetch profile on mount ──────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Redirect to login when unauthenticated ──────────────────────
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // ── Auto-select single branch ───────────────────────────────────
  useEffect(() => {
    if (user && branches.length === 1 && !activeBranchId) {
      setActiveBranch(branches[0].id);
    }
  }, [user, branches, activeBranchId, setActiveBranch]);

  // ── Fetch products when a branch is active ──────────────────────
  useEffect(() => {
    if (user && activeBranchId) {
      fetchProducts(activeBranchId);
    }
  }, [user, activeBranchId, fetchProducts]);

  // ── Retry handlers ──────────────────────────────────────────────
  const handleRetryProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRetryProducts = useCallback(() => {
    if (activeBranchId) {
      fetchProducts(activeBranchId);
    }
  }, [activeBranchId, fetchProducts]);

  // ── Render states (order matters) ───────────────────────────────

  // 1. Initial auth load
  if (isLoading || !user) {
    return (
      <FullScreenLoader
        message="Preparing session…"
        submessage="Verifying credentials"
      />
    );
  }

  // 2. Profile fetch failed
  if (profileError) {
    return (
      <FullScreenError
        message={profileError}
        onRetry={handleRetryProfile}
        onLogout={logout}
      />
    );
  }

  // 3. Branch selection required
  if (!activeBranchId) {
    return (
      <BranchSelectionScreen
        branches={branches}
        onSelect={setActiveBranch}
        onLogout={logout}
      />
    );
  }

  // 4. Products fetch failed
  if (productsError) {
    return (
      <FullScreenError
        message={productsError}
        onRetry={handleRetryProducts}
        onLogout={logout}
      />
    );
  }

  // 5. Products loading — guard against false-positive initial state
  //    Only show if there are no products yet (first load)
  if (isLoadingProducts && products.length === 0) {
    return (
      <FullScreenLoader
        message="Syncing Branch…"
        submessage="Loading products & inventory"
      />
    );
  }

  // 6. Ready
  return <POSLayout />;
}