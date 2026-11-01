import { useState, useEffect, useMemo } from 'react';
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

export default function Overview({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    const saved = localStorage.getItem(`pabee_float_${vendorId}`);
    return saved ? Number(saved) : 500; // Default ₹500 starting change float
  });
  const [isLoading, setIsLoading] = useState(true);

  // Expense / Cash Out Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'spent' | 'added'>('spent');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Milk');
  const [expenseNote, setExpenseNote] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  // 1. Fetch Today's Orders & Expenses
  const fetchFinancials = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [salesRes, profitRes] = await Promise.all([
        fetch(`${API_URL}/api/vendors/${vendorId}/sales`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/api/vendors/${vendorId}/profit/today`, { headers, cache: 'no-store' }),
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        const ordersArray = Array.isArray(salesData) ? salesData : salesData.orders || [];
        setOrders(ordersArray);
      }

      if (profitRes.ok) {
        const profitData = await profitRes.json();
        setExpenses(profitData.expensesList || []);
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
    const interval = setInterval(fetchFinancials, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  // 2. Financial Reconciler
  const ledger = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Filter completed orders strictly for today
    const todaysOrders = orders.filter((order) => {
      const dateStr = order.createdAt || order.created_at;
      if (!dateStr) return false;
      return new Date(dateStr).getTime() >= startOfToday;
    });

    let upiRevenue = 0;
    let cashRevenue = 0;

    todaysOrders.forEach((order) => {
      const amt = Number(order.total) || 0;
      const mode = (order.paymentMode || '').toUpperCase();
      if (mode === 'CASH') {
        cashRevenue += amt;
      } else {
        // UPI, RAZORPAY, etc.
        upiRevenue += amt;
      }
    });

    const totalRevenue = upiRevenue + cashRevenue;
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Physical Drawer Math: Morning Float + Cash Sales - Cash Expenses
    const expectedDrawerCash = Math.max(0, openingFloat + cashRevenue - totalExpenses);

    return {
      orderCount: todaysOrders.length,
      totalRevenue,
      upiRevenue,
      cashRevenue,
      totalExpenses,
      netProfit,
      expectedDrawerCash,
    };
  }, [orders, expenses, openingFloat]);

  // 3. Estimated Bank Settlement Date
  const settlementDateText = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }, []);

  // 4. Save New Expense / Cash Out
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amt,
          category: expenseType === 'added' ? 'CASH_IN' : expenseCategory,
          description: expenseNote.trim() || `${expenseCategory} payout`,
        }),
      });

      if (!res.ok) throw new Error('Failed to record expense');

      toast.success(expenseType === 'added' ? `Added ₹${amt} to galla` : `Logged ₹${amt} expense`);
      setExpenseAmount('');
      setExpenseNote('');
      setIsExpenseModalOpen(false);
      fetchFinancials();
    } catch {
      toast.error('Error saving transaction');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleUpdateFloat = (delta: number) => {
    const updated = Math.max(0, openingFloat + delta);
    setOpeningFloat(updated);
    localStorage.setItem(`pabee_float_${vendorId}`, updated.toString());
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Reconciling drawer & settlements…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 text-[#F5F0E8] font-sans pb-28 md:pb-8">
      
      {/* 1. Header & Summary Line */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Money & Galla</h1>
        <p className="text-xs md:text-sm text-[#9A9184] mt-0.5">
          Today: <b className="text-white">₹{ledger.totalRevenue.toLocaleString('en-IN')}</b> total sales across{' '}
          <b className="text-white">{ledger.orderCount}</b> orders
        </p>
      </div>

      {/* 2. Dual Pot Architecture */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Pot A: Bank (UPI / Online) */}
        <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9A9184]">
              Bank Pot (UPI)
            </div>
            <div className="text-3xl font-extrabold text-[#5CC97B] tabular-nums mt-1.5">
              ₹{ledger.upiRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-[#9A9184] mt-3 pt-2.5 border-t border-[#3A352E]/60 flex items-center justify-between">
            <span>Settles to your bank</span>
            <span className="font-semibold text-white">{settlementDateText}</span>
          </div>
        </div>

        {/* Pot B: Physical Galla (Drawer Cash) */}
        <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9A9184]">
              Galla Pot (Cash)
            </div>
            <div className="text-3xl font-extrabold text-[#E5B35C] tabular-nums mt-1.5">
              ₹{ledger.cashRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-[#9A9184] mt-3 pt-2.5 border-t border-[#3A352E]/60 flex items-center justify-between">
            <span>Should be in drawer now:</span>
            <span className="font-extrabold text-white tabular-nums">
              ₹{ledger.expectedDrawerCash.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Opening Cash Float Stepper */}
      <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E] flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-[#9A9184]">Morning Cash Float (Starting Change)</div>
          <div className="text-base font-bold text-white tabular-nums">₹{openingFloat}</div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#26231F] border border-[#3A352E] rounded-lg p-1">
          <button
            onClick={() => handleUpdateFloat(-100)}
            className="w-8 h-8 rounded-md bg-[#1C1A18] text-white font-bold hover:bg-[#3A352E] active:scale-95 text-base flex items-center justify-center"
            title="Decrease float by ₹100"
          >
            −
          </button>
          <span className="text-xs text-[#9A9184] px-2 font-mono">₹100</span>
          <button
            onClick={() => handleUpdateFloat(100)}
            className="w-8 h-8 rounded-md bg-[#1C1A18] text-white font-bold hover:bg-[#3A352E] active:scale-95 text-base flex items-center justify-center"
            title="Increase float by ₹100"
          >
            +
          </button>
        </div>
      </div>

      {/* 4. Action Toolbar */}
      <div className="flex gap-2.5">
        <button
          onClick={() => {
            setExpenseType('spent');
            setExpenseCategory('Milk');
            setIsExpenseModalOpen(true);
          }}
          className="flex-1 h-12 rounded-xl bg-[#26231F] border border-[#3A352E] font-bold text-sm text-red-400 hover:border-red-500/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>−</span>
          <span>Took Cash from Galla</span>
        </button>

        <button
          onClick={() => {
            setExpenseType('added');
            setExpenseCategory('Cash In');
            setIsExpenseModalOpen(true);
          }}
          className="flex-1 h-12 rounded-xl bg-[#26231F] border border-[#3A352E] font-bold text-sm text-[#5CC97B] hover:border-[#5CC97B]/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>Added Cash to Galla</span>
        </button>
      </div>

      {/* 5. Today's Profit & Loss Ledger */}
      <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#3A352E]/60">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9A9184]">
            Today's Net Profit
          </span>
          <span
            className={`text-2xl font-black tabular-nums ${
              ledger.netProfit >= 0 ? 'text-[#5CC97B]' : 'text-red-400'
            }`}
          >
            ₹{ledger.netProfit.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="text-xs text-[#9A9184] space-y-1.5 font-medium">
          <div className="flex justify-between">
            <span>Gross Sales (Completed Orders)</span>
            <span className="text-white font-bold tabular-nums">
              +₹{ledger.totalRevenue.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Expenses & Inventory Purchases</span>
            <span className="text-red-400 font-bold tabular-nums">
              −₹{ledger.totalExpenses.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Cash In & Out Ledger List */}
      <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9A9184]">
          Cash In and Out Today ({expenses.length})
        </h2>

        {expenses.length === 0 ? (
          <p className="text-xs text-[#7A7266] py-3 text-center">
            No expenses or cash payouts logged yet today.
          </p>
        ) : (
          <div className="divide-y divide-[#3A352E]/60 max-h-60 overflow-y-auto pr-1">
            {expenses.map((exp) => (
              <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{exp.description || exp.category}</div>
                  <div className="text-[10px] text-[#9A9184]">
                    {new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    <span className="px-1.5 py-0.5 rounded bg-[#26231F] text-[#C7BFB2]">
                      {exp.category}
                    </span>
                  </div>
                </div>
                <div
                  className={`font-bold text-sm tabular-nums ${
                    exp.category === 'CASH_IN' ? 'text-[#5CC97B]' : 'text-red-400'
                  }`}
                >
                  {exp.category === 'CASH_IN' ? '+' : '−'}₹{exp.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Slide-Up / Modal Sheet for Cash Moves */}
      {isExpenseModalOpen && (
        <div
          onClick={() => setIsExpenseModalOpen(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1C1A18] rounded-t-2xl sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-4"
          >
            <div className="w-10 h-1 bg-[#3A352E] rounded-full mx-auto sm:hidden" />

            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {expenseType === 'spent' ? 'Took Cash from Galla' : 'Added Cash to Galla'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#26231F] text-[#9A9184] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  min="1"
                  placeholder="e.g. 350"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full h-12 rounded-xl bg-[#26231F] border border-[#3A352E] px-4 text-xl font-bold text-white outline-none focus:border-[#E5B35C]"
                />
              </div>

              {expenseType === 'spent' && (
                <div>
                  <label className="block text-xs font-semibold text-[#9A9184] mb-1.5">
                    What was it for?
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['Milk', 'Vegetables', 'Gas', 'Raw Materials', 'Taken Home', 'Other'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setExpenseCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          expenseCategory === cat
                            ? 'bg-[#E5B35C] text-[#1A1206] border-[#E5B35C]'
                            : 'bg-[#26231F] text-[#C7BFB2] border-[#3A352E]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#9A9184] mb-1">
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5L Amul Taaza"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="w-full h-10 rounded-lg bg-[#26231F] border border-[#3A352E] px-3 text-sm text-white outline-none focus:border-[#E5B35C]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="w-full h-12 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isSubmittingExpense ? 'Recording…' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}