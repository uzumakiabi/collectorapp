'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Lock, Eye, EyeOff, Loader2, ArrowLeft, User, Moon, Sun, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { CURRENCY_LIST } from '@/lib/currency';

const AVATAR_OPTIONS = Array.from({ length: 10 }, (_, i) => `avatar-${i + 1}.png`);

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user');
        const u = await res.json();
        if (u?.name) setName(u.name);
        if (u?.bio) setBio(u.bio);
        if (u?.avatar) setAvatar(u.avatar);
        if (u?.currency) setCurrency(u.currency);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, avatar }),
      });
      if (res.ok) {
        setProfileMsg('Profile saved');
        setTimeout(() => setProfileMsg(''), 2500);
      } else {
        setProfileMsg('Failed to save profile');
      }
    } catch {
      setProfileMsg('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const changeCurrency = async (code: string) => {
    if (code === currency) return;
    try {
      const res = await fetch('/api/user/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: code }),
      });
      if (res.ok) setCurrency(code);
    } catch { /* silent */ }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirm) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data?.error ?? 'Failed to change password');
        return;
      }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch {
      setPwError('Something went wrong');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition" title="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 text-white mb-4">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account</p>
        </div>

        {/* Profile info */}
        <form onSubmit={saveProfile} className="bg-card rounded-xl p-6 shadow-lg space-y-4 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          {profileMsg && (
            <div className={`text-sm p-3 rounded-lg ${profileMsg === 'Profile saved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
              {profileMsg}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition"
              placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">About me</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition resize-none"
              placeholder="Write a short description about yourself" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Avatar</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => setAvatar(a)}
                  className={`w-16 h-16 rounded-full overflow-hidden transition border-2 ${
                    avatar === a ? 'border-teal-600 ring-2 ring-teal-600/30' : 'border-border hover:border-muted-foreground'
                  }`}>
                  <Image src={`/avatars/${a}`} alt="Avatar" width={64} height={64} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={savingProfile}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* Currency */}
        <div className="bg-card rounded-xl p-6 shadow-lg space-y-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Currency</h2>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCY_LIST.map(c => (
              <button key={c.code} onClick={() => changeCurrency(c.code)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition text-left ${
                  currency === c.code ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-border hover:border-muted-foreground'
                }`}>
                <span className="text-lg font-semibold text-foreground w-7">{c.symbol}</span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{c.code}</span>
                  <span className="block text-xs text-muted-foreground">{c.label}</span>
                </span>
                {currency === c.code && <Check className="w-4 h-4 text-teal-600 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Change password */}
        <form onSubmit={changePassword} className="bg-card rounded-xl p-6 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
          {pwError && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{pwError}</div>}
          {pwSuccess && <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm p-3 rounded-lg">Password changed successfully!</div>}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPw ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition"
                placeholder="Enter current password" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition"
                placeholder="Enter new password" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition"
                placeholder="Confirm new password" required />
            </div>
          </div>
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPw ? 'Hide passwords' : 'Show passwords'}
          </button>
          <button type="submit" disabled={pwLoading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pwLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
