import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithGoogle, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string })?.from || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please ensure Google OAuth is configured in PocketBase.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600/10 border border-amber-600/20 text-amber-500 mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
              Adventurer's Ledger
            </h1>
            <p className="text-slate-400 font-medium">Record your legends, navigate the unknown.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-4 px-4 rounded-2xl transition-all duration-300 shadow-lg shadow-white/5 active:scale-[0.98]"
            >
              {!isLoading ? (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                  Opening Portal...
                </div>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 leading-relaxed px-4">
              By proceeding, you agree to our Terms of Service and Privacy Policy. Your adventure is your own.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">Tale-Keeper Features</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
                <div className="text-2xl mb-2">⚔️</div>
                <div className="text-sm font-bold text-slate-200">Personal Fog</div>
                <div className="text-xs text-slate-500">Each explorer sees only what they've found.</div>
              </div>
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
                <div className="text-2xl mb-2">🗺️</div>
                <div className="text-sm font-bold text-slate-200">3D Realms</div>
                <div className="text-xs text-slate-500">Multi-layered maps for dungeons and keeps.</div>
              </div>
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
                <div className="text-2xl mb-2">📜</div>
                <div className="text-sm font-bold text-slate-200">Chronicle</div>
                <div className="text-xs text-slate-500">Track stats, inventory, and faction standing.</div>
              </div>
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm font-bold text-slate-200">Resonant</div>
                <div className="text-xs text-slate-500">Real-time sync between DM and Players.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs font-medium uppercase tracking-tighter">
            System v1.2.4 &bull; Forge v23
          </p>
        </div>
      </div>
    </div>
  );
}

