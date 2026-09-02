import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

export default function LedgerTab({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
  
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState({
    grossRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    expensesList: [] as any[]
  });

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Raw Materials');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfit = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/profit/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfitData({
          grossRevenue: data.grossRevenue,
          totalCost: data.totalCost,
          netProfit: data.netProfit,
          expensesList: data.expensesList
        });
      }
    } catch (err) {
      console.error("Failed to fetch P&L", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) fetchProfit();
  }, [vendorId]);

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return toast.error("Enter a valid amount");
    
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, category, description })
      });

      if (res.ok) {
        toast.success("Expense logged!");
        setShowModal(false);
        setAmount('');
        setDescription('');
        fetchProfit(); 
      } else {
        toast.error("Failed to log expense");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500 p-12 text-center animate-pulse">Calculating Ledger...</div>;

  const isProfitable = profitData.netProfit >= 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* 🚀 THE DAILY P&L SCOREBOARD */}
      <div className="bg-[#13161F] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 opacity-20 pointer-events-none ${isProfitable ? 'bg-green-500' : 'bg-red-500'}`}></div>
        
        <div className="flex justify-between items-end mb-6 relative z-10 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white">Today's Profit & Loss</h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Live Cash Flow</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#E5B35C] text-black hover:bg-yellow-400 font-bold py-2 px-6 rounded-xl transition-transform active:scale-95 shadow-lg"
          >
            + Log Expense
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-[#0A0C10] border border-gray-800/50 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Gross Revenue (In)</p>
            <p className="text-3xl font-black text-white">₹{profitData.grossRevenue}</p>
          </div>
          
          <div className="bg-[#0A0C10] border border-gray-800/50 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Expenses (Out)</p>
            <p className="text-3xl font-black text-red-400">-₹{profitData.totalCost}</p>
          </div>

          <div className={`border rounded-xl p-5 ${isProfitable ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>Net Profit</p>
            <p className={`text-4xl font-black ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
              {isProfitable ? '+' : '-'}₹{Math.abs(profitData.netProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 EXPENSE HISTORY LIST */}
      {profitData.expensesList.length > 0 && (
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5 shadow-md">
           <h3 className="text-lg font-bold text-white mb-4">Today's Purchases</h3>
           <div className="space-y-3">
             {profitData.expensesList.map(exp => (
               <div key={exp.id} className="flex justify-between items-center border-b border-gray-800/50 pb-3 last:border-0">
                 <div>
                   <p className="text-sm font-bold text-gray-300">{exp.category}</p>
                   {exp.description && <p className="text-xs text-gray-500">{exp.description}</p>}
                 </div>
                 <div className="text-right">
                   <p className="font-black text-red-400">-₹{exp.amount}</p>
                   <p className="text-[10px] text-gray-600">{new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 🚨 THE LOG EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0E14]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161F] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">Log Market Purchase</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleLogExpense} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Amount Spent (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#1A1D24] text-white p-3 rounded-xl border border-gray-800 outline-none focus:border-[#E5B35C] text-lg font-bold" placeholder="e.g. 800" autoFocus required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#1A1D24] text-white p-3 rounded-xl border border-gray-800 outline-none focus:border-[#E5B35C]">
                  <option value="Raw Materials">Raw Materials (Food/Veg)</option>
                  <option value="Packaging">Packaging (Boxes/Bags)</option>
                  <option value="Fuel">Fuel (Gas Cylinder)</option>
                  <option value="Wages">Daily Wages</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Description (Optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#1A1D24] text-gray-300 p-3 rounded-xl border border-gray-800 outline-none focus:border-[#E5B35C] text-sm" placeholder="e.g. 5kg chicken, 2kg onions" />
              </div>

              <button type="submit" disabled={isSubmitting} className="mt-2 w-full py-4 bg-[#E5B35C] text-black font-black rounded-xl transition-transform active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Deduct from Profit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}