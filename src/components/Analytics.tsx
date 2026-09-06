import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import RevenueTab from './analytics/RevenueTab';
import MenuMatrixTab from './analytics/MenuMatrixTab'; 
import HeatmapTab from './analytics/HeatmapTab';
import CustomersTab from './analytics/CustomersTab';
import ForecastTab from './analytics/ForecastTab';
import InsightsTab from './analytics/InsightsTab';
import LedgerTab from './analytics/LedgerTab';

type PeriodType = 'day' | 'week' | 'month' | 'year';

interface FilterState {
  pay: 'all' | 'upi' | 'cash';
  svc: 'all' | 'dinein' | 'takeaway';
  src: 'all' | 'customer' | 'manual';
  cat: string;
}

export default function Analytics({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  
  // Raw Data Pools
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Demo Engine State: Period, Comparison, Filters
  const [curPeriod, setCurPeriod] = useState<PeriodType>('day');
  const [compareOn, setCompareOn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    pay: 'all',
    svc: 'all',
    src: 'all',
    cat: 'all'
  });

  // Deep Dive Reports State
  const [curReportCategory, setCurReportCategory] = useState('sales');
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);

  const DAILY_TARGET = 4000;

  // 1. Fetch Real Live Data Stream
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [salesRes, menuRes] = await Promise.all([
          fetch(`${API_URL}/api/vendors/${vendorId}/sales`, { headers }),
          fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, { headers })
        ]);

        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setRawOrders(salesData.orders || []);
        }
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenuItems(menuData.items || []);
        }
      } catch (error) {
        console.error("Failed to load live analytics data", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (vendorId) fetchData();
  }, [vendorId]);

  // 2. Date Range Calculations
  const getPeriodRange = (period: PeriodType, offset: number) => {
    const now = new Date();
    const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 86400000;

    if (period === 'day') {
      const end = baseDay - offset * dayMs + dayMs;
      return [end - dayMs, end];
    }
    if (period === 'week') {
      const end = baseDay - offset * 7 * dayMs + dayMs;
      return [end - 7 * dayMs, end];
    }
    if (period === 'month') {
      const end = baseDay - offset * 30 * dayMs + dayMs;
      return [end - 30 * dayMs, end];
    }
    const end = baseDay - offset * 365 * dayMs + dayMs;
    return [end - 365 * dayMs, end];
  };

  // 3. Filter Application
  const applyFilters = (orderList: any[]) => {
    return orderList.filter((o) => {
      const payMode = (o.paymentMode || o.pay || '').toLowerCase();
      if (filters.pay !== 'all' && payMode !== filters.pay) return false;

      const service = (o.serviceType || (o.tableId && o.tableId !== 'Counter' ? 'dinein' : 'takeaway')).toLowerCase();
      if (filters.svc !== 'all' && service !== filters.svc) return false;

      const source = (o.source || (o.customerName === 'Counter Order' ? 'manual' : 'customer')).toLowerCase();
      if (filters.src !== 'all' && source !== filters.src) return false;

      if (filters.cat !== 'all') {
        const hasCategory = (o.items || []).some((it: any) => {
          const matched = menuItems.find((m) => m.name.toLowerCase() === it.name.toLowerCase());
          return matched && matched.category === filters.cat;
        });
        if (!hasCategory) return false;
      }
      return true;
    });
  };

  // Processed Current & Previous Orders
  const currentOrders = useMemo(() => {
    const [start, end] = getPeriodRange(curPeriod, 0);
    return applyFilters(rawOrders.filter((o) => {
      const t = new Date(o.createdAt || o.ts).getTime();
      return t >= start && t < end;
    }));
  }, [rawOrders, curPeriod, filters, menuItems]);

  const previousOrders = useMemo(() => {
    const [start, end] = getPeriodRange(curPeriod, 1);
    return applyFilters(rawOrders.filter((o) => {
      const t = new Date(o.createdAt || o.ts).getTime();
      return t >= start && t < end;
    }));
  }, [rawOrders, curPeriod, filters, menuItems]);

  // Aggregate Metrics
  const activeOrders = currentOrders.filter((o) => o.kitchenStatus !== 'cancelled');
  const prevActiveOrders = previousOrders.filter((o) => o.kitchenStatus !== 'cancelled');
  const cancelledOrders = currentOrders.filter((o) => o.kitchenStatus === 'cancelled');

  const confirmedCount = activeOrders.length;
  const prevCount = prevActiveOrders.length;
  const totalRev = activeOrders.reduce((sum, o) => sum + (o.total || o.amount || 0), 0);
  const prevRev = prevActiveOrders.reduce((sum, o) => sum + (o.total || o.amount || 0), 0);

  const upiOrdersCount = activeOrders.filter((o) => (o.paymentMode || o.pay || '').toUpperCase() === 'UPI').length;
  const cashOrdersCount = confirmedCount - upiOrdersCount;
  const upiRate = confirmedCount > 0 ? Math.round((upiOrdersCount / confirmedCount) * 100) : 0;

  const targetPeriodAmount = curPeriod === 'day' ? DAILY_TARGET : curPeriod === 'week' ? DAILY_TARGET * 7 : curPeriod === 'month' ? DAILY_TARGET * 30 : DAILY_TARGET * 365;
  const targetPct = Math.min(100, Math.round((totalRev / targetPeriodAmount) * 100));

  const fmtM = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const renderDelta = (cur: number, prev: number) => {
    if (!compareOn) return null;
    if (!prev) return <span className="text-[10px] text-gray-500">no prior data</span>;
    const change = Math.round(((cur - prev) / prev) * 100);
    const up = change >= 0;
    return (
      <span className={`text-[10px] font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '▲' : '▼'} {Math.abs(change)}% vs prev {curPeriod}
      </span>
    );
  };

  const categories = useMemo(() => Array.from(new Set(menuItems.map((m) => m.category).filter(Boolean))), [menuItems]);

  // Deep Dive Reports Catalog Setup
  const REPORT_CATEGORIES = [
    { key: 'sales', icon: '📈', label: 'Sales Reports' },
    { key: 'tax', icon: '🧾', label: 'Tax & Accounting' },
    { key: 'discounts', icon: '🏷️', label: 'Discounts & Cancellations' },
    { key: 'customer', icon: '👥', label: 'Customer Recurrence' },
    { key: 'tables', icon: '🪑', label: 'Table Turnover' },
    { key: 'dayend', icon: '💰', label: 'Till Settlement' }
  ];

  const REPORTS_MAP: Record<string, { key: string; label: string; desc: string }[]> = {
    sales: [
      { key: 'daily', label: 'Sales Breakdown', desc: 'Revenue, orders, and average ticket size for this period' },
      { key: 'hourly', label: 'Hourly Order Distribution', desc: 'Clock hour concentration of orders' },
      { key: 'topitems', label: 'Top Selling Items', desc: 'Most ordered items ranked by quantity' },
      { key: 'profit', label: 'Food Cost & Margins', desc: 'Calculated from menu cost price vs actual sales' }
    ],
    tax: [
      { key: 'gst', label: 'GST Liability Split', desc: 'Estimated 5% GST divided into CGST and SGST' }
    ],
    discounts: [
      { key: 'cancelled', label: 'Cancelled Tickets Log', desc: 'Audit voided and cancelled tickets' }
    ],
    customer: [
      { key: 'custsummary', label: 'Customer Frequency', desc: 'Repeat orders identified by phone number' }
    ],
    tables: [
      { key: 'tables', label: 'Table Occupancy', desc: 'Orders and revenue grouped by table' }
    ],
    dayend: [
      { key: 'dayend', label: 'Register Settlement', desc: 'Physical cash balance vs UPI reconciliation' }
    ]
  };

  const renderReportDetail = (key: string) => {
    const itemMap: Record<string, number> = {};
    activeOrders.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        itemMap[it.name] = (itemMap[it.name] || 0) + (it.qty || 1);
      });
    });
    const sortedItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]);

    switch (key) {
      case 'daily':
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-xl font-bold text-white font-serif">{fmtM(totalRev)}</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">Revenue</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-xl font-bold text-white font-serif">{confirmedCount}</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">Confirmed</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-xl font-bold text-white font-serif">{fmtM(confirmedCount ? totalRev / confirmedCount : 0)}</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">Avg Ticket</div>
            </div>
          </div>
        );
      case 'hourly': {
        const hourMap: Record<number, number> = {};
        activeOrders.forEach((o) => {
          const h = new Date(o.createdAt || o.ts).getHours();
          hourMap[h] = (hourMap[h] || 0) + 1;
        });
        const hours = Object.entries(hourMap).sort((a, b) => Number(a[0]) - Number(b[0]));
        const maxH = Math.max(1, ...Object.values(hourMap));
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl space-y-3">
            {hours.length === 0 ? <p className="text-xs text-gray-500">No orders recorded in this period.</p> : hours.map(([h, cnt]) => (
              <div key={h}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{h}:00</span>
                  <span className="text-blue-400 font-bold">{cnt} orders</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(cnt / maxH) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 'topitems':
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl divide-y divide-gray-800">
            {sortedItems.map(([name, qty], idx) => (
              <div key={name} className="py-2.5 flex justify-between text-xs">
                <span className="text-gray-300"><strong className="text-gray-500 mr-2">#{idx + 1}</strong>{name}</span>
                <span className="text-[#E5B35C] font-bold">{qty} sold</span>
              </div>
            ))}
          </div>
        );
      case 'profit': {
        const cogs = activeOrders.reduce((total, o) => {
          return total + (o.items || []).reduce((sub: number, it: any) => {
            const m = menuItems.find((mi) => mi.name.toLowerCase() === it.name.toLowerCase());
            return sub + ((m?.costPrice || 0) * (it.qty || 1));
          }, 0);
        }, 0);
        const gross = totalRev - cogs;
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-lg font-bold text-white">{fmtM(totalRev)}</div>
              <div className="text-[9px] text-gray-500 uppercase mt-1">Revenue</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-lg font-bold text-red-400">{fmtM(cogs)}</div>
              <div className="text-[9px] text-gray-500 uppercase mt-1">Food Cost</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-lg font-bold text-green-400">{fmtM(gross)}</div>
              <div className="text-[9px] text-gray-500 uppercase mt-1">Gross Profit</div>
            </div>
          </div>
        );
      }
      case 'gst': {
        const totalGst = Math.round(totalRev * 0.05);
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-white font-serif">{fmtM(totalGst)}</div>
            <p className="text-[10px] text-gray-500 uppercase mt-1">5% Net GST Estimated</p>
          </div>
        );
      }
      case 'cancelled':
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl divide-y divide-gray-800">
            {cancelledOrders.length === 0 ? <p className="text-xs text-gray-500">Zero cancellations in this period.</p> : cancelledOrders.map((o) => (
              <div key={o.id} className="py-2.5 flex justify-between text-xs">
                <span className="text-gray-300">Ticket #{o.token || o.id.slice(0, 5)}</span>
                <span className="text-red-400 font-bold">{fmtM(o.total || o.amount)}</span>
              </div>
            ))}
          </div>
        );
      case 'custsummary': {
        const phoneTracker: Record<string, { count: number; spend: number; name: string }> = {};
        activeOrders.forEach((o) => {
          const ph = o.customerPhone;
          if (ph && ph !== '0000000000') {
            if (!phoneTracker[ph]) phoneTracker[ph] = { count: 0, spend: 0, name: o.customerName || 'Walk-in' };
            phoneTracker[ph].count++;
            phoneTracker[ph].spend += (o.total || o.amount || 0);
          }
        });
        const list = Object.entries(phoneTracker).sort((a, b) => b[1].count - a[1].count);
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl divide-y divide-gray-800">
            {list.length === 0 ? <p className="text-xs text-gray-500">No phone numbers logged in this timeframe.</p> : list.map(([ph, info]) => (
              <div key={ph} className="py-2 flex justify-between text-xs">
                <span className="text-white font-medium">{info.name} ({ph})</span>
                <span className="text-[#E5B35C] font-bold">{info.count} visits · {fmtM(info.spend)}</span>
              </div>
            ))}
          </div>
        );
      }
      case 'tables': {
        const tableMap: Record<string, { orders: number; rev: number }> = {};
        activeOrders.forEach((o) => {
          const tbl = o.tableId || 'Counter';
          if (!tableMap[tbl]) tableMap[tbl] = { orders: 0, rev: 0 };
          tableMap[tbl].orders++;
          tableMap[tbl].rev += (o.total || o.amount || 0);
        });
        return (
          <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl divide-y divide-gray-800">
            {Object.entries(tableMap).map(([tbl, d]) => (
              <div key={tbl} className="py-2.5 flex justify-between text-xs">
                <span className="text-white font-medium">Table {tbl}</span>
                <span className="text-gray-400">{d.orders} tickets · <strong className="text-[#E5B35C]">{fmtM(d.rev)}</strong></span>
              </div>
            ))}
          </div>
        );
      }
      case 'dayend': {
        const cashRev = activeOrders.filter((o) => (o.paymentMode || o.pay || '').toUpperCase() === 'CASH').reduce((s, o) => s + (o.total || o.amount || 0), 0);
        const upiRev = activeOrders.filter((o) => (o.paymentMode || o.pay || '').toUpperCase() === 'UPI').reduce((s, o) => s + (o.total || o.amount || 0), 0);
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-2xl font-black text-green-400 font-serif">{fmtM(cashRev)}</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">Cash in Register</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2330] p-4 rounded-xl text-center">
              <div className="text-2xl font-black text-blue-400 font-serif">{fmtM(upiRev)}</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">UPI Reconciled</div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#E5B35C] animate-pulse font-bold tracking-widest uppercase">Crunching Numbers...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl pb-10">
      
      {/* HEADER & PERIOD FILTER TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#1F2330] pb-4">
        <div>
          <h1 className="text-3xl font-serif text-[#E5B35C] mb-1">Business Intelligence</h1>
          <p className="text-xs text-gray-500">Real-time analytical insights for your kitchen counter</p>
        </div>

        {/* Period Picker */}
        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <div className="flex bg-[#13161F] p-1 rounded-xl border border-[#1F2330] w-full md:w-auto justify-center">
            {(['day', 'week', 'month', 'year'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setCurPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  curPeriod === p ? 'bg-[#E5B35C] text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-400">
              <input
                type="checkbox"
                checked={compareOn}
                onChange={(e) => setCompareOn(e.target.checked)}
                className="accent-[#E5B35C]"
              />
              Compare previous
            </label>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-[#E5B35C] font-bold hover:underline"
            >
              🔍 Filters {Object.values(filters).filter((v) => v !== 'all').length > 0 && `(${Object.values(filters).filter((v) => v !== 'all').length})`}
            </button>
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="p-4 bg-[#13161F] border border-[#1F2330] rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 font-bold block mb-1 uppercase text-[10px]">Payment</span>
            <div className="flex gap-2">
              {['all', 'upi', 'cash'].map((val) => (
                <button
                  key={val}
                  onClick={() => setFilters({ ...filters, pay: val as any })}
                  className={`px-3 py-1 rounded capitalize font-medium ${filters.pay === val ? 'bg-[#E5B35C] text-black' : 'bg-[#0B0E14] text-gray-400'}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-gray-500 font-bold block mb-1 uppercase text-[10px]">Service</span>
            <div className="flex gap-2">
              {['all', 'dinein', 'takeaway'].map((val) => (
                <button
                  key={val}
                  onClick={() => setFilters({ ...filters, svc: val as any })}
                  className={`px-3 py-1 rounded capitalize font-medium ${filters.svc === val ? 'bg-[#E5B35C] text-black' : 'bg-[#0B0E14] text-gray-400'}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-gray-500 font-bold block mb-1 uppercase text-[10px]">Category</span>
            <select
              value={filters.cat}
              onChange={(e) => setFilters({ ...filters, cat: e.target.value })}
              className="w-full bg-[#0B0E14] border border-gray-700 p-1.5 rounded-lg text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ pay: 'all', svc: 'all', src: 'all', cat: 'all' })}
              className="text-red-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* TOP DYNAMIC KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#13161F] border-t-2 border-t-[#E5B35C] border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-[#E5B35C] mb-1">{fmtM(totalRev)}</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Revenue ({curPeriod})</p>
          <div>{renderDelta(totalRev, prevRev)}</div>
        </div>

        <div className="bg-[#13161F] border-t-2 border-t-orange-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-white mb-1">{confirmedCount}</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Confirmed Orders</p>
          <div>{renderDelta(confirmedCount, prevCount)}</div>
        </div>

        <div className="bg-[#13161F] border-t-2 border-t-green-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-serif text-green-500 mb-1">{targetPct}%</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Target Progress</p>
          </div>
          <div>
            <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-green-500 h-full rounded-full" style={{ width: `${targetPct}%` }}></div>
            </div>
            <p className="text-xs text-gray-500">Target: {fmtM(targetPeriodAmount)}</p>
          </div>
        </div>

        <div className="bg-[#13161F] border-t-2 border-t-blue-500 border-[#1F2330] border-x border-b rounded-xl p-5 shadow-md">
          <h2 className="text-3xl font-serif text-blue-500 mb-1">{upiRate}%</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">UPI Rate</p>
          <p className="text-sm text-gray-400">{upiOrdersCount} UPI · {cashOrdersCount} cash</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-6 border-b border-[#1F2330] pb-px overflow-x-auto no-scrollbar mt-2">
        {[
          { id: 'revenue', icon: '📈', label: 'Revenue' },
          { id: 'reports', icon: '📊', label: 'Deep Dive' }, // 👈 Demo drilldown catalog
          { id: 'ledger', icon: '💰', label: 'P&L Ledger' },
          { id: 'menu-matrix', icon: '🍽️', label: 'Menu Matrix' },
          { id: 'heatmap', icon: '🔥', label: 'Heatmap' },
          { id: 'customers', icon: '👥', label: 'Customers' },
          { id: 'forecast', icon: '🔮', label: 'Forecast' },
          { id: 'insights', icon: '💡', label: 'Insights' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab.id ? 'border-[#E5B35C] text-[#E5B35C]' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="opacity-80">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* COMPLETE ROUTED VIEW TERMINALS */}
      <div className="min-h-[400px]">
      {activeTab === 'revenue' && (
  <RevenueTab
    data={{
      revenue: totalRev.toString(),
      orders: confirmedCount,
      avgOrder: confirmedCount ? Math.round(totalRev / confirmedCount) : 0,
      rating: 5.0,
      paymentSplit: [
        { label: 'UPI / QR', percentage: upiRate, color: 'bg-blue-500' },
        { label: 'Cash', percentage: 100 - upiRate, color: 'bg-[#E5B35C]' }
      ],
      topItems: [],
      menuMatrix: { stars: [], plowhorses: [], puzzles: [], dogs: [], margins: [] },
      heatmap: { hourly: [], peakHours: [], slowTip: { title: '', subtitle: '' } },
      customers: { confirmedOrders: confirmedCount, repeatRate: 0, ltv: 0, orderSizeBreakdown: [] },
      forecast: { weeklyProjected: 0, days: [] },
      insights: { items: [] }
    }}
  />
)}

        {/* 🚀 DEEP DIVE REPORT CATALOG (From HTML Demo) */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-[#1F2330] pb-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCurReportCategory(cat.key);
                    setActiveReportKey(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    curReportCategory === cat.key ? 'bg-[#E5B35C] text-black' : 'bg-[#13161F] text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>

            {activeReportKey ? (
              <div className="bg-[#13161F] border border-[#1F2330] p-5 rounded-xl">
                <button
                  onClick={() => setActiveReportKey(null)}
                  className="text-xs text-[#E5B35C] font-bold hover:underline mb-4 inline-block"
                >
                  ← Back to Reports
                </button>
                <h3 className="text-base font-bold text-white mb-4">
                  {REPORTS_MAP[curReportCategory]?.find((r) => r.key === activeReportKey)?.label}
                </h3>
                {renderReportDetail(activeReportKey)}
              </div>
            ) : (
              <div className="space-y-2">
                {(REPORTS_MAP[curReportCategory] || []).map((r) => (
                  <div
                    key={r.key}
                    onClick={() => setActiveReportKey(r.key)}
                    className="bg-[#13161F] border border-[#1F2330] hover:border-[#E5B35C] p-4 rounded-xl cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{r.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                    </div>
                    <span className="text-[#E5B35C] font-bold text-sm">→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ledger' && <LedgerTab vendorId={vendorId} />}

        {activeTab === 'menu-matrix' && <MenuMatrixTab data={{ stars: [], plowhorses: [], puzzles: [], dogs: [], margins: [] }} />}

        {activeTab === 'customers' && <CustomersTab data={{ confirmedOrders: confirmedCount, repeatRate: 0, ltv: 0, orderSizeBreakdown: [] }} />}
        
        {activeTab === 'heatmap' && <HeatmapTab data={{ hourly: [], peakHours: [], slowTip: { title: '', subtitle: '' } }} />}
        
        {activeTab === 'forecast' && <ForecastTab data={{ weeklyProjected: 0, days: [] }} />}

        {activeTab === 'insights' && <InsightsTab data={{ items: [] }} />}
      </div>

    </div>
  );
}