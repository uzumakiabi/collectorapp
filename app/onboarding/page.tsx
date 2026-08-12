'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Check, ChevronLeft, ChevronRight, Plus, SkipForward, Loader2 } from 'lucide-react';
import { CURRENCY_LIST } from '@/lib/currency';
import { ItemModal } from '@/components/item-modal';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, catRes] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/categories'),
        ]);
        const user = await userRes.json();
        const cats = await catRes.json();
        if (user?.currency) setCurrency(user.currency);
        const list = Array.isArray(cats) ? cats : [];
        setCategories(list);
        setSelectedCats(new Set(list.map((c: any) => c.id)));
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  const toggleCat = (id: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveCurrency = async () => {
    await fetch('/api/user/currency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency }),
    });
  };

  const deleteUnselectedCategories = async () => {
    for (const cat of categories) {
      if (!selectedCats.has(cat.id)) {
        await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  };

  const completeOnboarding = async () => {
    await fetch('/api/user/onboarded', { method: 'POST' }).catch(() => {});
    router.replace('/');
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        await saveCurrency();
        setStep(2);
      } else if (step === 2) {
        await deleteUnselectedCategories();
        setStep(3);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleItemSaved = async () => {
    setShowItemModal(false);
    await completeOnboarding();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const steps = ['Currency', 'Categories', 'First Item'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 text-white mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Get Started</h1>
          <p className="text-muted-foreground mt-1">Let&apos;s set up your collection manager</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${i + 1 <= step ? 'text-teal-600' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i + 1 < step ? 'bg-teal-600 text-white' : i + 1 === step ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:inline">{label}</span>
              </div>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-lg">
          {/* Step 1: Currency */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1">Choose your currency</h2>
              <p className="text-sm text-muted-foreground mb-4">Prices will be shown in this currency. You can change it later.</p>
              <div className="grid grid-cols-2 gap-3">
                {CURRENCY_LIST.map(c => (
                  <button key={c.code} onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${
                      currency === c.code ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-border hover:border-muted-foreground'
                    }`}>
                    <span className="text-xl font-semibold text-foreground w-8">{c.symbol}</span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{c.code}</span>
                      <span className="block text-xs text-muted-foreground">{c.label}</span>
                    </span>
                    {currency === c.code && <Check className="w-4 h-4 text-teal-600 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-1">Select your categories</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose which categories you want to keep. Unselected ones will be removed.</p>
              <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {categories.map((cat: any) => (
                  <button key={cat.id} onClick={() => toggleCat(cat.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition text-left ${
                      selectedCats.has(cat.id) ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-border hover:border-muted-foreground'
                    }`}>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    {selectedCats.has(cat.id) && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: First item or skip */}
          {step === 3 && (
            <div className="text-center">
              <h2 className="text-lg font-display font-semibold text-foreground mb-1">You&apos;re all set!</h2>
              <p className="text-sm text-muted-foreground mb-6">Add your first collection item, or skip and explore the app.</p>
              <div className="space-y-3">
                <button onClick={() => setShowItemModal(true)}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add your first item
                </button>
                <button onClick={completeOnboarding}
                  className="w-full py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition inline-flex items-center justify-center gap-2">
                  <SkipForward className="w-4 h-4" /> Skip to homepage
                </button>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          {step < 3 && (
            <div className="flex items-center justify-between mt-6">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} disabled={saving}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <span />}
              <button onClick={handleNext} disabled={saving}
                className="inline-flex items-center gap-1 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showItemModal && (
        <ItemModal
          item={null}
          categories={categories.filter((c: any) => selectedCats.has(c.id))}
          folders={[]}
          onClose={() => setShowItemModal(false)}
          onSaved={handleItemSaved}
          defaultCategoryId={null}
        />
      )}
    </div>
  );
}
