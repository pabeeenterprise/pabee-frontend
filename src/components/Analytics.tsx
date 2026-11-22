import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

type PeriodType = 'day' | 'week' | 'month';

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  token?: number;
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

interface DishStat {
  name: string;
  qty: number;
  revenue: number;
}

interface CustomerStat {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastVisit: Date;
}

// Separate "[Note: ...]" appended by Checkout.tsx so CRM & Excel stay clean
function parseCustomerAndNote(raw?: string): { cleanName: string; note: string } {
  const text = (raw || '').trim();
  const match = text.match(/^(.*?)\s*\[Note:\s*(.*?)\]$/i);
  if (match) {
    return {
      cleanName: match[1].trim() || 'Walk-in Diner',
      note: match[2].trim(),
    };
  }
  return { cleanName: text || 'Walk-in Diner', note: '' };
}

// Prevent Excel formula injection (=, +, -, @) on user-entered text cells
function safeCell(val: string | number): string | number {
  if (typeof val === 'number') return val;
  return /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
}

export default function Analytics({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<PeriodType>('day');
  const [customerSearch, setCustomerSearch] = useState('');

  // 1. Fetch Bounded Completed Orders with Race-Condition Protection
  useEffect(() => {
    if (!vendorId) return;

    const controller = new AbortController();
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;

    const fetchSalesData = async () => {
      setIsRefreshing(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/vendors/${vendorId}/sales?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (res.ok && !controller.signal.aborted) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('Failed to load sales analytics', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchSalesData();
    return () => controller.abort();
  }, [vendorId, period, API_URL, getToken]);

  // 2. Exact Local-Midnight Filter for Selected Period (Today, 7 Days, 30 Days)
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
    const cashPercent = grossRevenue > 0 ? 100 - upiPercent : 0;

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

  // 4. Full Dish Performance (Export uses ALL dishes; UI card shows top 6)
  const allDishStats = useMemo<DishStat[]>(() => {
    const itemMap: Record<string, DishStat> = {};

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const cleanName = it.name.trim();
        if (!itemMap[cleanName]) {
          itemMap[cleanName] = { name: cleanName, qty: 0, revenue: 0 };
        }
        const qty = Number(it.qty) || 1;
        const price = Number(it.price) || 0;
        itemMap[cleanName].qty += qty;
        itemMap[cleanName].revenue += price * qty;
      });
    });

    return Object.values(itemMap).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
  }, [filteredOrders]);

  const topDishes = useMemo(() => allDishStats.slice(0, 6), [allDishStats]);

  // 5. Full Customer Intelligence Pool (Cleaned of cook notes, unfiltered by search)
  const allCustomers = useMemo(() => {
    const map = new Map<string, CustomerStat>();

    filteredOrders.forEach((o) => {
      const ph = (o.customerPhone || '').replace(/\D/g, '');
      const { cleanName } = parseCustomerAndNote(o.customerName);
      const amt = Number(o.total) || 0;
      const orderDate = new Date(o.createdAt || o.created_at || Date.now());

      const key =
        ph.length >= 10 && ph !== '0000000000' ? ph : `anon_${cleanName.toLowerCase()}`;

      const existing = map.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += amt;
        if (cleanName !== 'Walk-in' && cleanName !== 'Counter Order') {
          existing.name = cleanName;
        }
        if (orderDate > existing.lastVisit) {
          existing.lastVisit = orderDate;
        }
      } else {
        map.set(key, {
          phone: ph.length >= 10 && ph !== '0000000000' ? ph : 'Direct Walk-in',
          name: cleanName,
          orderCount: 1,
          totalSpent: amt,
          lastVisit: orderDate,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.orderCount - a.orderCount || b.totalSpent - a.totalSpent
    );
  }, [filteredOrders]);

  // 6. Search-Filtered View for the CRM List Only
  const customerLedger = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [allCustomers, customerSearch]);

  const repeatCustomersCount = useMemo(() => {
    return allCustomers.filter((c) => c.orderCount > 1).length;
  }, [allCustomers]);

  const retentionPercent =
    allCustomers.length > 0
      ? Math.round((repeatCustomersCount / allCustomers.length) * 100)
      : 0;

  // 7. Dynamic Multi-Sheet Excel (.xlsx) Export (0 kB cost until clicked)
  const handleExportExcel = async () => {
    if (filteredOrders.length === 0) {
      toast.error('No completed orders to export for this period');
      return;
    }

    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const periodLabel =
        period === 'day' ? 'Today' : period === 'week' ? 'Past 7 Days' : 'Past 30 Days';
      const generatedAt = new Date().toLocaleString('en-IN');

      // Sheet 1: Executive Summary
      const summaryRows: (string | number)[][] = [
        ['Sales & Customer Intelligence Report', ''],
        ['Period', periodLabel],
        ['Generated At', generatedAt],
        ['', ''],
        ['Key Performance Metric', 'Value'],
        ['Total Revenue (INR)', metrics.grossRevenue],
        ['Orders Fulfilled', metrics.orderCount],
        ['Average Ticket (INR)', metrics.avgOrderValue],
        ['Unique Customers', allCustomers.length],
        ['Repeat Diners', repeatCustomersCount],
        ['Customer Retention (%)', `${retentionPercent}%`],
        ['', ''],
        ['Payment Settlement Split', 'Amount (INR)', 'Share (%)'],
        ['UPI / Online', metrics.upiRevenue, `${metrics.upiPercent}%`],
        ['Cash', metrics.cashRevenue, `${metrics.cashPercent}%`],
        ['Total', metrics.grossRevenue, '100%'],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Sheet 2: Full Dish Performance (All Dishes)
      const totalDishRevenue = allDishStats.reduce((s, d) => s + d.revenue, 0);
      const dishRows: (string | number)[][] = [
        ['Rank', 'Dish Name', 'Qty Sold', 'Revenue (INR)', 'Revenue Share (%)'],
        ...allDishStats.map((d, idx) => [
          idx + 1,
          safeCell(d.name),
          d.qty,
          d.revenue,
          totalDishRevenue > 0 ? `${Math.round((d.revenue / totalDishRevenue) * 100)}%` : '0%',
        ]),
      ];
      const dishSheet = XLSX.utils.aoa_to_sheet(dishRows);
      dishSheet['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, dishSheet, 'Dish Performance');

      // Sheet 3: Customer CRM & Frequency
      const crmRows: (string | number)[][] = [
        ['Customer Name', 'Mobile Number', 'Visits', 'Segment', 'Total Spent (INR)', 'Avg / Visit (INR)', 'Last Visit'],
        ...allCustomers.map((c) => [
          safeCell(c.name),
          safeCell(c.phone),
          c.orderCount,
          c.orderCount > 1 ? 'Regular' : 'First-Time',
          c.totalSpent,
          Math.round(c.totalSpent / c.orderCount),
          c.lastVisit.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        ]),
      ];
      const crmSheet = XLSX.utils.aoa_to_sheet(crmRows);
      crmSheet['!cols'] = [
        { wch: 24 },
        { wch: 16 },
        { wch: 9 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, crmSheet, 'Customer CRM');

      // Sheet 4: Raw Order Ledger (For Reconciliation & Accounting)
      const ledgerRows: (string | number)[][] = [
        ['Date & Time', 'Token #', 'Table / Mode', 'Customer Name', 'Phone', 'Payment', 'Items', 'Cook Note', 'Total (INR)'],
        ...filteredOrders.map((o) => {
          const { cleanName, note } = parseCustomerAndNote(o.customerName);
          const dt = new Date(o.createdAt || o.created_at || Date.now());
          const itemsSummary = (o.items || [])
            .map((i) => `${i.qty}x ${i.name}`)
            .join(', ');
          return [
            dt.toLocaleString('en-IN'),
            o.token ? `#${o.token}` : o.id.slice(-4).toUpperCase(),
            safeCell(o.tableId || 'Counter'),
            safeCell(cleanName),
            safeCell(o.customerPhone && o.customerPhone !== '0000000000' ? o.customerPhone : 'Walk-in'),
            safeCell(o.paymentMode || 'CASH'),
            safeCell(itemsSummary),
            safeCell(note),
            Number(o.total) || 0,
          ];
        }),
      ];
      const ledgerSheet = XLSX.utils.aoa_to_sheet(ledgerRows);
      ledgerSheet['!cols'] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 16 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 36 },
        { wch: 22 },
        { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(wb, ledgerSheet, 'Order Ledger');

      const dateSlug = new Date().toISOString().slice(0, 10);
      const periodSlug = period === 'day' ? 'today' : period === 'week' ? '7d' : '30d';
      XLSX.writeFile(wb, `pabee-sales-report-${periodSlug}-${dateSlug}.xlsx`);
      toast.success('Excel report downloaded');
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('Failed to generate Excel report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Calculating business intelligence…
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#F5F0E8] font-sans pb-12">
      {/* 1. Header, Period Switcher & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3A352E]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Sales & Customer Intelligence</h2>
            {isRefreshing && (
              <span className="text-[11px] font-semibold text-[#E5B35C] animate-pulse">
                Updating…
              </span>
            )}
          </div>
          <p className="text-xs text-[#9A9184] mt-0.5">
            Audit sales, dish performance, and customer repeat visits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex bg-[#1C1A18] border border-[#3A352E] rounded-full p-1">
            {(['day', 'week', 'month'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  period === p
                    ? 'bg-[#F5F0E8] text-[#121110]'
                    : 'text-[#9A9184] hover:text-[#F5F0E8]'
                }`}
              >
                {p === 'day' ? 'Today' : p === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || isRefreshing || filteredOrders.length === 0}
            className="min-h-[42px] px-4 rounded-full bg-[#E5B35C] text-[#1A1206] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e9bc6e] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>📥</span>
            <span>{isExporting ? 'Exporting…' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Streamlined KPI Cards */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity ${
          isRefreshing ? 'opacity-60' : 'opacity-100'
        }`}
      >
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
            {allCustomers.length > 0 ? `${retentionPercent}% retention` : 'No visits'}
          </div>
        </div>
      </div>

      {/* 3. Payment Mode Breakdown Bar */}
      <div className="p-3.5 rounded-xl bg-[#1C1A18] border border-[#3A352E] space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span>Payment Settlement Split</span>
          <span className="text-[#9A9184]">
            UPI ₹{metrics.upiRevenue.toLocaleString('en-IN')} ({metrics.upiPercent}%) · Cash ₹
            {metrics.cashRevenue.toLocaleString('en-IN')} ({metrics.cashPercent}%)
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
              <div
                key={cust.phone + cust.name}
                className="py-2.5 flex items-center justify-between text-xs"
              >
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