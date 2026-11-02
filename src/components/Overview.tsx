import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  total: number;
  paymentMode: string;
  items: OrderItem[];
  createdAt?: string | Date;
  created_at?: string | Date;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const DENOMS = [500, 200, 100, 50, 20, 10] as const;
type Denom = typeof DENOMS[number];

const NOTE_COL: Record<Denom, string> = {
  500: '#BDB5A6',
  200: '#E8B84A',
  100: '#B9A9D6',
  50: '#8FC3D9',
  20: '#C9D27A',
  10: '#9B6B4A',
};

export default function Overview({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Terminal Phase: 'overview' | 'closing' | 'closed'
  const [phase, setPhase] = useState<'overview' | 'closing' | 'closed'>('overview');

  // Morning Float (Default ₹800 matching prototype)
  const [floatAmount, setFloatAmount] = useState<number>(() => {
    const saved = localStorage.getItem(`pabee_float_${vendorId}`);
    return saved ? Number(saved) : 800;
  });

  // Cash In/Out Modal
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAction, setCashAction] = useState<'spent' | 'added'>('spent');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('Milk');
  const [cashNote, setCashNote] = useState('');
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);

  // Closing State (Denomination count)
  const [counts, setCounts] = useState<Record<Denom, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [coins, setCoins] = useState('');
  const [closingStep, setClosingStep] = useState<'count' | 'revealed'>('count');
  const [keepInDrawer, setKeepInDrawer] = useState<number>(800);
  const [isSkipped, setIsSkipped] = useState(false);

  // Fetch Financial Data
  const fetchData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [salesRes, profitRes] = await Promise.all([
        fetch(`${API_URL}/api/vendors/${vendorId}/sales`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/api/vendors/${vendorId}/profit/today`, { headers, cache: 'no-store' }),
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setOrders(Array.isArray(salesData) ? salesData : salesData.orders || []);
      }

      if (profitRes.ok) {
        const profitData = await profitRes.json();
        setExpenses(profitData.expensesList || []);
      }
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  // Financial Ledger Math
  const ledger = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todaysOrders = orders.filter((o) => {
      const d = o.createdAt || o.created_at;
      return d ? new Date(d).getTime() >= startOfToday : false;
    });

    let upi = 0;
    let cash = 0;

    todaysOrders.forEach((o) => {
      const amt = Number(o.total) || 0;
      if ((o.paymentMode || '').toUpperCase() === 'CASH') {
        cash += amt;
      } else {
        upi += amt;
      }
    });

    const spent = expenses
      .filter((e) => e.category !== 'CASH_IN')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const added = expenses
      .filter((e) => e.category === 'CASH_IN')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const sales = upi + cash;
    const expectedDrawer = Math.max(0, floatAmount + cash - spent + added);
    const netProfit = sales - spent;

    return {
      orderCount: todaysOrders.length,
      sales,
      upi,
      cash,
      spent,
      added,
      netProfit,
      expectedDrawer,
    };
  }, [orders, expenses, floatAmount]);

  // Counted Cash Total
  const countedTotal = useMemo(() => {
    const noteTotal = DENOMS.reduce((sum, d) => sum + d * (counts[d] || 0), 0);
    return noteTotal + (Number(coins) || 0);
  }, [counts, coins]);

  // Tomorrow Note-Mix Allocation Algorithm
  const noteMixText = useMemo(() => {
    const parts: string[] = [];
    let remaining = keepInDrawer;
    const coinAmt = Math.min(Number(coins) || 0, remaining);
    if (coinAmt > 0) remaining -= coinAmt;

    [10, 20, 50, 100, 200, 500].forEach((k) => {
      if (remaining <= 0) return;
      const available = counts[k as Denom] || 0;
      const take = Math.min(available, Math.floor(remaining / k));
      if (take > 0) {
        parts.push(`${take} × ₹${k}`);
        remaining -= take * k;
      }
    });

    if (coinAmt > 0) parts.push(`coins ₹${coinAmt}`);
    return parts.join(', ') || 'Exact change';
  }, [keepInDrawer, counts, coins]);

  // Settlement Day Estimation
  const settlementDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }, []);

  // Quick Float Updates
  const handleUpdateFloat = (delta: number) => {
    const updated = Math.max(0, floatAmount + delta);
    setFloatAmount(updated);
    localStorage.setItem(`pabee_float_${vendorId}`, updated.toString());
  };

  // Add / Spend Cash Handler
  const handleSaveCashMove = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(cashAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    // Strictly reject empty or whitespace-only descriptions when "Other" is chosen
    if (cashAction === 'spent' && cashReason === 'Other' && !cashNote.trim()) {
      toast.error('Please enter what this cash was spent on');
      otherInputRef.current?.focus();
      return;
    }

    setIsSubmittingCash(true);
    try {
      const token = await getToken();

      const finalDescription = cashAction === 'added'
        ? 'Added Cash'
        : cashReason === 'Other'
        ? cashNote.trim()
        : cashNote.trim()
        ? `${cashReason}: ${cashNote.trim()}`
        : `${cashReason} payout`;

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amt,
          category: cashAction === 'added' ? 'CASH_IN' : cashReason,
          description: finalDescription,
        }),
      });

      if (!res.ok) throw new Error('Transaction failed');

      toast.success(cashAction === 'added' ? `₹${amt} added to galla` : `₹${amt} deducted from galla`);
      setCashAmount('');
      setCashNote('');
      setIsCashModalOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to log cash move');
    } finally {
      setIsSubmittingCash(false);
    }
  };

  // Counter Stepper for Banknotes
  const updateNoteCount = (denom: Denom, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] || 0) + delta),
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Reconciling drawer & settlements…
      </div>
    );
  }

  // ==============================================================
  // VIEW 1: LIVE MONEY TERMINAL (`moneyScr`)
  // ==============================================================
  if (phase === 'overview') {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 text-[#F5F0E8] font-sans">
        {/* Dual Pot Row (`.pots` + `.pot`) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bank Pot */}
          <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#C7BFB2]">Bank (UPI)</div>
              <div className="text-[26px] leading-8 font-bold tabular-nums text-white mt-1">
                ₹{ledger.upi.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[13px] text-[#9A9184] mt-2">
              Reaches your bank {settlementDate}
            </div>
          </div>

          {/* Galla Pot */}
          <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#C7BFB2]">Galla (cash)</div>
              <div className="text-[26px] leading-8 font-bold tabular-nums text-white mt-1">
                ₹{ledger.cash.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-[13px] text-[#9A9184] mt-2">
              In galla now: <b className="text-white">₹{ledger.expectedDrawer.toLocaleString('en-IN')}</b>
            </div>
          </div>
        </div>

        {/* Day Total Summary */}
        <p className="text-[15px] font-semibold text-[#C7BFB2] pt-1">
          Total today ₹{ledger.sales.toLocaleString('en-IN')} · {ledger.orderCount} orders
        </p>

        {/* Action Toolbar */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              setCashAction('spent');
              setCashReason('Milk');
              setCashNote('');
              setIsCashModalOpen(true);
            }}
            className="min-h-[44px] px-4 rounded-full border border-[#3A352E] bg-[#1C1A18] text-sm font-semibold text-[#F5F0E8] active:scale-95 transition-transform"
          >
            Took cash from galla
          </button>
          <button
            onClick={() => {
              setCashAction('added');
              setCashNote('');
              setIsCashModalOpen(true);
            }}
            className="min-h-[44px] px-4 rounded-full border border-[#3A352E] bg-[#1C1A18] text-sm font-semibold text-[#F5F0E8] active:scale-95 transition-transform"
          >
            Added to galla
          </button>
        </div>

        {/* Moves Card (`.vcard` + `.mv`) */}
        <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-4 space-y-1">
          <h3 className="text-[17px] leading-[22px] font-semibold mb-2">
            Cash in and out today
          </h3>

          {expenses.length === 0 ? (
            <p className="text-xs text-[#7A7266] py-2">—</p>
          ) : (
            expenses.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center min-h-[48px] border-b border-[#3A352E] last:border-b-0 text-[15px] tabular-nums"
              >
                <span>{m.description || m.category}</span>
                <span className={m.category === 'CASH_IN' ? 'text-[#5CC97B]' : 'text-[#FF6B5E]'}>
                  {m.category === 'CASH_IN' ? '+' : '−'}₹{m.amount}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Starting Float Adjustment */}
        <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#9A9184]">Morning starting float</div>
            <div className="text-lg font-bold text-white tabular-nums">₹{floatAmount}</div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#26231F] border border-[#3A352E] rounded-lg p-1">
            <button
              onClick={() => handleUpdateFloat(-100)}
              className="w-8 h-8 rounded-md bg-[#1C1A18] text-white font-bold hover:bg-[#3A352E] active:scale-95"
            >
              −
            </button>
            <span className="text-xs text-[#9A9184] px-2 font-mono">₹100</span>
            <button
              onClick={() => handleUpdateFloat(100)}
              className="w-8 h-8 rounded-md bg-[#1C1A18] text-white font-bold hover:bg-[#3A352E] active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Big Close Day Trigger Button */}
        <div className="pt-3">
          <button
            onClick={() => {
              setPhase('closing');
              setClosingStep('count');
              setIsSkipped(false);
            }}
            className="w-full h-16 rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-lg text-center active:scale-[0.98] transition-transform shadow-md"
          >
            Close the day
          </button>
        </div>

        {/* Cash Out / Cash In Modal */}
        {isCashModalOpen && (
          <div
            onClick={() => setIsCashModalOpen(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#1C1A18] rounded-t-[20px] sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  {cashAction === 'spent' ? 'Took cash from galla' : 'Add cash to galla'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCashMove} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="e.g. 250"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full h-12 rounded-lg bg-[#26231F] border border-[#3A352E] px-3.5 text-xl font-bold text-white outline-none focus:border-[#E5B35C]"
                  />
                </div>

                {cashAction === 'spent' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#9A9184] mb-1.5">
                        What for?
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {['Milk', 'Vegetables', 'Gas', 'Taken Home', 'Other'].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setCashReason(r);
                              if (r === 'Other') {
                                setTimeout(() => otherInputRef.current?.focus(), 50);
                              }
                            }}
                            className={`min-h-[40px] px-4 rounded-full border text-sm font-semibold transition-colors ${
                              cashReason === r
                                ? 'bg-[#F5F0E8] text-[#121110] border-[#F5F0E8]'
                                : 'bg-[#26231F] text-[#C7BFB2] border-[#3A352E]'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto-focused required description field when Other is selected */}
                    {cashReason === 'Other' && (
                      <div className="animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-[#E5B35C] mb-1">
                          Specify expense description *
                        </label>
                        <input
                          ref={otherInputRef}
                          type="text"
                          required
                          placeholder="e.g. Ice cubes, tape, cleaning cloth"
                          value={cashNote}
                          onChange={(e) => setCashNote(e.target.value)}
                          className="w-full h-11 rounded-lg bg-[#26231F] border border-[#E5B35C] px-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#E5B35C]"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingCash}
                  className="w-full h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {isSubmittingCash ? 'Saving…' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: CLOSING RITUAL (`closingScr`)
  // ==============================================================
  const diff = countedTotal - ledger.expectedDrawer;
  const isMatch = Math.abs(diff) <= 10 || isSkipped;

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 text-[#F5F0E8] font-sans pb-32">
      <div className="flex items-center gap-2 pb-2 border-b border-[#3A352E]">
        <button
          onClick={() => setPhase('overview')}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-[#E5B35C] active:scale-90"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Close the day</h1>
      </div>

      {phase === 'closed' ? (
        <div className="space-y-4">
          <div className="p-6 text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E8] text-[#121110] font-black text-2xl mx-auto flex items-center justify-center">
              ✓
            </div>
            <h2 className="text-2xl font-bold">Shop closed. See you tomorrow.</h2>
          </div>

          <div className="text-sm font-semibold text-[#C7BFB2]">Summary sent to your WhatsApp</div>
          <div className="bg-[#1F3B2C] text-[#F5F0E8] rounded-xl rounded-bl-sm p-3.5 text-sm leading-relaxed whitespace-pre-line font-mono border border-emerald-500/20">
            {`pabee · ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}\nToday’s profit: ₹${ledger.netProfit.toLocaleString('en-IN')}\nSales ₹${ledger.sales.toLocaleString('en-IN')} from ${ledger.orderCount} orders · UPI ₹${ledger.upi.toLocaleString('en-IN')} · Cash ₹${ledger.cash.toLocaleString('en-IN')}\nGalla: ${isSkipped ? 'Not counted' : isMatch ? 'Galla matches' : diff < 0 ? `₹${Math.abs(diff)} short` : `₹${diff} excess`}\nChanges to look at: none\nOpen pabee for full hisaab.`}
          </div>

          <button
            onClick={() => setPhase('overview')}
            className="w-full h-14 rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-base active:scale-[0.98] transition-transform"
          >
            Start tomorrow morning
          </button>
        </div>
      ) : closingStep === 'count' ? (
        <div className="space-y-3">
          <h2 className="text-[22px] font-bold">Count the galla</h2>
          <p className="text-sm text-[#C7BFB2]">
            Count each kind of note. We show what should be there after you finish.
          </p>

          <div className="divide-y divide-[#3A352E] border-y border-[#3A352E]">
            {DENOMS.map((k) => (
              <div
                key={k}
                className="grid grid-cols-[84px_56px_1fr_56px] items-center gap-2 min-h-[64px]"
              >
                <span className="font-bold text-[22px] flex items-center gap-2">
                  <span
                    className="w-6 h-4 rounded-sm inline-block shrink-0"
                    style={{ backgroundColor: NOTE_COL[k] }}
                  />
                  ₹{k}
                </span>

                <button
                  type="button"
                  onClick={() => updateNoteCount(k, -1)}
                  className="w-14 h-14 rounded-xl bg-[#26231F] text-2xl font-bold flex items-center justify-center active:scale-95"
                >
                  −
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  value={counts[k] || 0}
                  onChange={(e) =>
                    setCounts((prev) => ({
                      ...prev,
                      [k]: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                  className="w-full h-14 rounded-xl border border-[#3A352E] bg-[#1C1A18] text-center text-[28px] font-bold tabular-nums text-white outline-none focus:border-[#E5B35C]"
                />

                <button
                  type="button"
                  onClick={() => updateNoteCount(k, 1)}
                  className="w-14 h-14 rounded-xl bg-[#26231F] text-2xl font-bold flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            ))}

            <div className="grid grid-cols-[1fr_140px] gap-2 items-center min-h-[64px] pt-1">
              <span className="font-bold text-lg">Coins (total ₹)</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={coins}
                onChange={(e) => setCoins(e.target.value)}
                className="w-full h-14 rounded-xl border border-[#3A352E] bg-[#1C1A18] text-center text-[22px] font-bold tabular-nums text-white outline-none focus:border-[#E5B35C]"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setIsSkipped(true);
              setClosingStep('revealed');
            }}
            className="text-xs font-semibold text-[#9A9184] hover:text-white underline pt-1 block"
          >
            Skip count today
          </button>

          <div className="fixed left-0 right-0 bottom-0 bg-[#1C1A18] border-t border-[#3A352E] px-4 py-3 z-30 max-w-xl mx-auto space-y-2">
            <div className="text-xl font-bold tabular-nums">
              Counted ₹{countedTotal.toLocaleString('en-IN')}
            </div>
            <button
              onClick={() => setClosingStep('revealed')}
              className="w-full h-14 rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-lg active:scale-[0.98] transition-transform"
            >
              Done counting
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-4">
            <div className="flex justify-between items-center text-[15px] font-bold">
              <span>Counted</span>
              <span className="tabular-nums text-lg">₹{countedTotal.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={() => setClosingStep('count')}
              className="text-xs text-[#E5B35C] underline font-semibold mt-2"
            >
              Count again
            </button>
          </div>

          <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-4 divide-y divide-[#3A352E]/60 text-sm">
            <div className="flex justify-between py-2">
              <span>Morning cash float</span>
              <span className="tabular-nums">+₹{floatAmount}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Cash orders collected</span>
              <span className="tabular-nums">+₹{ledger.cash}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Paid from galla</span>
              <span className="tabular-nums text-[#FF6B5E]">−₹{ledger.spent}</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-base text-white pt-2.5 border-t border-[#3A352E]">
              <span>Should be in galla</span>
              <span className="tabular-nums">₹{ledger.expectedDrawer.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 border font-bold ${
              isMatch
                ? 'bg-[#15291B] border-emerald-500/30 text-[#5CC97B]'
                : 'bg-[#2E2410] border-amber-500/30 text-[#F2B33D]'
            }`}
          >
            <div className="text-lg">
              {isMatch
                ? '✓ Galla matches'
                : diff < 0
                ? `₹${Math.abs(diff)} less than the hisaab`
                : `₹${diff} more than the hisaab`}
            </div>
            {!isMatch && (
              <div className="text-xs font-normal text-[#C7BFB2] mt-1">
                Common reasons: Cash spent on milk/ice without logging, or an unentered refund.
              </div>
            )}
          </div>

          <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#9A9184]">
              Today&apos;s Net Profit
            </div>
            <div className="text-3xl font-extrabold text-[#5CC97B] tabular-nums mt-1">
              ₹{ledger.netProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#9A9184] mt-1">
              Sales ₹{ledger.sales} − Expenses ₹{ledger.spent}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-[#26231F] rounded-xl p-3.5 min-h-[132px] flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-[#9A9184]">Keep in galla for tomorrow</div>
                <div className="text-2xl font-bold tabular-nums text-white mt-1">
                  ₹{Math.min(keepInDrawer, countedTotal)}
                </div>
              </div>
              <div className="flex gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setKeepInDrawer((prev) => Math.max(0, prev - 100))}
                  className="w-12 h-10 rounded-lg bg-[#1C1A18] border border-[#3A352E] font-bold text-base flex items-center justify-center active:scale-95"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setKeepInDrawer((prev) => prev + 100)}
                  className="w-12 h-10 rounded-lg bg-[#1C1A18] border border-[#3A352E] font-bold text-base flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-[#26231F] rounded-xl p-3.5 min-h-[132px] flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-[#9A9184]">Take home</div>
                <div className="text-2xl font-bold tabular-nums text-emerald-400 mt-1">
                  ₹{Math.max(0, countedTotal - keepInDrawer)}
                </div>
              </div>
              <span className="text-[11px] text-[#9A9184]">Ready for bank deposit</span>
            </div>
          </div>

          <p className="text-xs text-[#9A9184] px-1">
            Keep: <b className="text-white">{noteMixText}</b>
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                localStorage.setItem(`pabee_float_${vendorId}`, keepInDrawer.toString());
                setPhase('closed');
                toast.success('Day closed successfully!');
              }}
              className="w-full h-14 rounded-xl bg-[#E5B35C] text-[#1A1206] font-semibold text-lg active:scale-[0.98] transition-transform"
            >
              Close shop for today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}