'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to reset password');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-4 rounded-lg">
        Password reset successfully! Redirecting to sign in...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-lg space-y-4">
      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            placeholder="Enter new password" required
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            placeholder="Confirm new password" required
          />
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-teal-600 hover:underline font-medium">Back to sign in</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 text-white mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-1">Choose a new password for your account</p>
        </div>
        <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
