'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to change password');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/'), 2000);
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
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Change Password</h1>
          <p className="text-muted-foreground mt-1">Update your account password</p>
        </div>

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-4 rounded-lg mb-4">
            Password changed successfully! Redirecting...
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-lg space-y-4">
            {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  placeholder="Enter current password" required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  placeholder="Enter new password" required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  placeholder="Confirm new password" required
                />
              </div>
            </div>
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPw ? 'Hide passwords' : 'Show passwords'}
            </button>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Updating...' : 'Change Password'}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="inline-flex items-center gap-1 text-teal-600 hover:underline font-medium">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
