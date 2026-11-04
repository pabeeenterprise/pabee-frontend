import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

type PeriodType = 'day' | 'week' | 'month';

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
  kitchenStatus: string;
  customerName?: string;
  customerPhone?: string;
  tableId?: string;
  items: OrderItem[];
  createdAt?: string | Date;
  created_at?: string | Date;
}

interface CustomerStat {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastVisit: Date;
}

export default function Analytics({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<PeriodType>('day');
  const [customerSearch, setCustomerSearch] = useState('');

  // 1. Fetch Completed Orders from Sales API
  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/sales`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load sales analytics', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (vendorId) fetchSalesData();
  }, [vendorId, API_URL]);

  // 2. Filter Orders by Selected Period (Today, 7 Days, 30 Days)
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 86400000;

    const threshold =
      period === 'day'
        ? startOfToday
        : period === 'week'
        ? startOfToday - 7 * dayMs
        : startOfToday - 30 * dayMs;

    return orders.filter((o) => {
      const d = o.createdAt || o.created_at;
      if (!d) return false;
      return new Date(d).getTime() >= threshold && o.kitchenStatus !== 'cancelled';
    });
  }, [orders, period]);

  // 3. Financial Metrics
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let upiRevenue = 0;
    let cashRevenue = 0;

    filteredOrders.forEach((o) => {
      const amt = Number(o.total) || 0;
      grossRevenue += amt;
      if ((o.paymentMode || '').toUpperCase() === 'CASH') {
        cashRevenue += amt;
      } else {
        upiRevenue += amt;
      }
    });

    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(grossRevenue / orderCount) : 0;
    const upiPercent = grossRevenue > 0 ? Math.round((upiRevenue / grossRevenue) * 100) : 0;
    const cashPercent = 100 - upiPercent;

    return {
      grossRevenue,
      upiRevenue,
      cashRevenue,
      orderCount,
      avgOrderValue,
      upiPercent,
      cashPercent,
    };
  }, [filteredOrders]);

  // 4. Top Selling Dishes
  const topDishes = useMemo(() => {
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const cleanName = it.name.trim();
        if (!itemMap[cleanName]) {
          itemMap[cleanName] = { name: cleanName, qty: 0, revenue: 0 };
        }
        itemMap[cleanName].qty += Number(it.qty) || 1;
        itemMap[cleanName].revenue += (Number(it.price) || 0) * (Number(it.qty) || 1);
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [filteredOrders]);

  // 5. Customer Intelligence Ledger (Grouped by Phone Number)
  const customerLedger = useMemo(() => {
    const map = new Map<string, CustomerStat>();

    filteredOrders.forEach((o) => {
      const ph = (o.customerPhone || '').replace(/\D/g, '');
      const name = o.customerName?.trim() || 'Walk-in Diner';
      const amt = Number(o.total) || 0;
      const orderDate = new Date(o.createdAt || o.created_at || Date.now());

      // If no valid phone, track by name or fallback key
      const key = ph.length >= 10 && ph !== '0000000000' ? ph : `anon_${name.toLowerCase()}`;

      const existing = map.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += amt;
        if (name !== 'Walk-in' && name !== 'Counter Order') {
          existing.name = name;
        }
        if (orderDate > existing.lastVisit) {
          existing.lastVisit = orderDate;
        }
      } else {
        map.set(key, {
          phone: ph.length >= 10 && ph !== '0000000000' ? ph : 'Direct Walk-in',
          name,
          orderCount: 1,
          totalSpent: amt,
          lastVisit: orderDate,
        });
      }
    });

    let list = Array.from(map.values()).sort((a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent);

    if (customerSearch.trim()) {
      const q = customerSearch.trim().toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }

    return list;
  }, [filteredOrders, customerSearch]);

  const repeatCustomersCount = useMemo(() => {
    return customerLedger.filter((c) => c.orderCount > 1).length;
  }, [customerLedger]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Calculating business intelligence…
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#F5F0E8] font-sans pb-12">
      
      {/* 1. Header & Quick Period Pill Switcher (No Dropdown Clutter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3A352E]">
        <div>
          <h2 className="text-xl font-bold">Sales & Customer Intelligence</h2>
          <p className="text-xs text-[#9A9184] mt-0.5">
            Audit sales, dish performance, and customer repeat visits
          </p>
        </div>

        {/* Clean 3-Option Period Switcher */}
        <div className="inline-flex bg-[#1C1A18] border border-[#3A352E] rounded-full p-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`min-h-[34px] px-4 rounded-full text-xs font-semibold capitalize transition-colors ${
                period === p
                  ? 'bg-[#F5F0E8] text-[#121110]'
                  : 'text-[#9A9184] hover:text-[#F5F0E8]'
              }`}
            >
              {p === 'day' ? 'Today' : p === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Streamlined KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E]">
          <div className="text-xs font-semibold text-[#9A9184]">Total Revenue</div>
          <div className="text-2xl font-black text-[#5CC97B] tabular-nums mt-1">
            ₹{metrics.grossRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#9A9184] mt-1">Completed tickets</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E]">
          <div className="text-xs font-semibold text-[#9A9184]">Orders Fulfilled</div>
          <div className="text-2xl font-black text-white tabular-nums mt-1">
            {metrics.orderCount}
          </div>
          <div className="text-[11px] text-[#9A9184] mt-1">Excludes cancelled</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E]">
          <div className="text-xs font-semibold text-[#9A9184]">Average Ticket</div>
          <div className="text-2xl font-black text-[#E5B35C] tabular-nums mt-1">
            ₹{metrics.avgOrderValue}
          </div>
          <div className="text-[11px] text-[#9A9184] mt-1">Per paid customer</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E]">
          <div className="text-xs font-semibold text-[#9A9184]">Repeat Diners</div>
          <div className="text-2xl font-black text-[#7FB0F0] tabular-nums mt-1">
            {repeatCustomersCount}
          </div>
          <div className="text-[11px] text-[#9A9184] mt-1">
            {customerLedger.length > 0
              ? `${Math.round((repeatCustomersCount / customerLedger.length) * 100)}% retention`
              : 'No visits'}
          </div>
        </div>
      </div>

      {/* 3. Payment Mode Breakdown Bar */}
      <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E] space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span>Payment Settlement Split</span>
          <span className="text-[#9A9184]">
            UPI ₹{metrics.upiRevenue.toLocaleString('en-IN')} ({metrics.upiPercent}%) · Cash ₹{metrics.cashRevenue.toLocaleString('en-IN')} ({metrics.cashPercent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#26231F] overflow-hidden flex">
          <div style={{ width: `${metrics.upiPercent}%` }} className="bg-[#5CC97B] h-full" />
          <div style={{ width: `${metrics.cashPercent}%` }} className="bg-[#E5B35C] h-full" />
        </div>
      </div>

      {/* 4. Top Selling Dishes */}
      <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#9A9184]">
            Top Moving Dishes ({topDishes.length})
          </h3>
          <span className="text-xs text-[#9A9184]">Ranked by volume</span>
        </div>

        {topDishes.length === 0 ? (
          <p className="text-xs text-[#7A7266] py-3 text-center">No dishes sold in this period.</p>
        ) : (
          <div className="divide-y divide-[#3A352E]">
            {topDishes.map((item, idx) => (
              <div key={item.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#26231F] text-[#E5B35C] font-bold flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-white text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-sm tabular-nums">
                    {item.qty} sold
                  </span>
                  <span className="text-[#9A9184] block text-[11px]">
                    ₹{item.revenue.toLocaleString('en-IN')} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Real Customer CRM & Repeat Ledger */}
      <div className="p-4 rounded-xl bg-[#1C1A18] border border-[#3A352E] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#3A352E]/60">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#9A9184]">
              Customer Visit Frequency & CRM ({customerLedger.length})
            </h3>
            <p className="text-xs text-[#9A9184] mt-0.5">
              Identified by customer mobile number or counter ticket tag
            </p>
          </div>

          {/* Inline Search Filter */}
          <input
            type="text"
            placeholder="Search name or phone…"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#26231F] border border-[#3A352E] text-xs text-white outline-none focus:border-[#E5B35C] w-full sm:w-56"
          />
        </div>

        {customerLedger.length === 0 ? (
          <p className="text-xs text-[#7A7266] py-4 text-center">No customer records found.</p>
        ) : (
          <div className="divide-y divide-[#3A352E] max-h-80 overflow-y-auto pr-1">
            {customerLedger.map((cust) => (
              <div key={cust.phone + cust.name} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{cust.name}</span>
                    {cust.orderCount > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B35C]/20 text-[#E5B35C]">
                        {cust.orderCount}× Regular
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9A9184] mt-0.5">
                    📱 {cust.phone} · Last visit:{' '}
                    {cust.lastVisit.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-white text-sm tabular-nums">
                    ₹{cust.totalSpent.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[#9A9184] block text-[10px]">
                    Avg: ₹{Math.round(cust.totalSpent / cust.orderCount)}/visit
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}