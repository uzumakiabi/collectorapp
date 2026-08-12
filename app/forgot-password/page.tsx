'use client';

import { useState } from 'react';
import { Package, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong');
        return;
      }
      if (data?.resetUrl) {
        setResetUrl(data.resetUrl);
      } else {
        setResetUrl('__none__');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 text-white mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Forgot Password</h1>
          <p className="text-muted-foreground mt-1">Enter your email to reset your password</p>
        </div>

        {resetUrl === '__none__' && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-4 rounded-lg mb-4">
            If that email is registered, a reset link has been generated. Please check your email.
          </div>
        )}

        {resetUrl && resetUrl !== '__none__' && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-4 rounded-lg mb-4 space-y-2">
            <p>Your password reset link (no email service is configured, so it is shown here):</p>
            <a href={resetUrl} className="font-medium underline break-all">{resetUrl}</a>
          </div>
        )}

        {!resetUrl && (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-lg space-y-4">
            {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  placeholder="Enter your email" required
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="inline-flex items-center gap-1 text-teal-600 hover:underline font-medium">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
