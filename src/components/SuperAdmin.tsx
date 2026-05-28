import { useState } from 'react';

// --- MOCK DATA MATCHING YOUR SCREENSHOTS ---
const MOCK_VENDORS = [
  { id: '1', name: 'Spice Street Chaat', loc: 'Kothrud, Pune', joined: 'Jan 2025', gmv: 62400, orders: 1247, status: 'active' },
  { id: '2', name: 'Vada Pav King', loc: 'Shivajinagar, Pune', joined: 'Feb 2025', gmv: 48600, orders: 980, status: 'active' },
  { id: '3', name: 'Pune Bhel House', loc: 'FC Road, Pune', joined: 'Mar 2025', gmv: 38200, orders: 820, status: 'active' },
  { id: '4', name: 'Chai Wala Mohan', loc: 'Deccan, Pune', joined: 'Jan 2025', gmv: 24800, orders: 640, status: 'active' },
  { id: '5', name: 'Night Market Chaat', loc: 'Koregaon Park, Pune', joined: 'Apr 2025', gmv: 32100, orders: 580, status: 'active' },
  { id: '6', name: 'Mumbai Wali Bhaji', loc: 'Baner, Pune', joined: 'Mar 2025', gmv: 8400, orders: 120, status: 'inactive' },
  { id: '7', name: 'Sev Puri Central', loc: 'Hadapsar, Pune', joined: 'Feb 2025', gmv: 21600, orders: 460, status: 'active' },
  { id: '8', name: 'Fresh Juice Corner', loc: 'Aundh, Pune', joined: 'May 2025', gmv: 14800, orders: 340, status: 'active' },
];

const MOCK_ORDERS = [
  { id: 'ORD-8821', status: 'ready', pay: 'UPI', vendor: 'Spice Street Chaat', items: 'Pav Bhaji x2, Chai x1', time: '2 min ago', price: 180 },
  { id: 'ORD-8820', status: 'preparing', pay: 'Cash', vendor: 'Vada Pav King', items: 'Cheese Vada Pav x3', time: '5 min ago', price: 120 },
  { id: 'ORD-8819', status: 'done', pay: 'UPI', vendor: 'Pune Bhel House', items: 'Bhel Puri x2, Sev Puri x1', time: '8 min ago', price: 160 },
  { id: 'ORD-8818', status: 'done', pay: 'Cash', vendor: 'Chai Wala Mohan', items: 'Masala Chai x4', time: '12 min ago', price: 80 },
  { id: 'ORD-8817', status: 'new', pay: 'UPI', vendor: 'Spice Street Chaat', items: 'Special Pav Bhaji x1, Cold Coffee x1', time: '1 min ago', price: 170 },
  { id: 'ORD-8816', status: 'preparing', pay: 'UPI', vendor: 'Night Market Chaat', items: 'Dahi Puri x3', time: '6 min ago', price: 210 },
];

const MOCK_LOGS = [
  { vendor: 'Spice Street Chaat', action: 'Menu price changed', desc: 'Pav Bhaji: ₹70 → ₹80', time: '10 min ago', tag: 'price', color: 'bg-orange-500/20 text-orange-400' },
  { vendor: 'Vada Pav King', action: 'New item added', desc: 'Cheese Vada Pav — ₹40', time: '1h ago', tag: 'menu', color: 'bg-blue-500/20 text-blue-400' },
  { vendor: 'Pune Bhel House', action: 'Offer activated', desc: '15% off bhel · 6–8 PM', time: '2h ago', tag: 'offer', color: 'bg-green-500/20 text-green-400' },
  { vendor: 'Mumbai Wali Bhaji', action: 'Vendor paused by admin', desc: 'Inactivity — 5 days offline', time: '3h ago', tag: 'admin', color: 'bg-red-500/20 text-red-400' },
  { vendor: 'Fresh Juice Corner', action: 'Branding updated', desc: 'Color scheme changed to green', time: '4h ago', tag: 'brand', color: 'bg-blue-500/20 text-blue-400' },
  { vendor: 'Spice Street Chaat', action: 'Order status changed', desc: 'ORD-8801: Ready → Completed', time: '15 min ago', tag: 'order', color: 'bg-gray-500/20 text-gray-400' },
  { vendor: 'Chai Wala Mohan', action: 'Operating hours updated', desc: 'Now open 7 AM – 10 PM', time: '5h ago', tag: 'settings', color: 'bg-gray-500/20 text-gray-400' },
];

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'vendors', label: 'Vendors', icon: '🏪' },
    { id: 'orders', label: 'Orders', icon: '🧾' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'logs', label: 'Activity logs', icon: '📁' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  // --- RENDERERS FOR EACH TAB ---

  const renderDashboard = () => (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">Platform command centre</h1>
          <p className="text-xs text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> All systems operational · 48 vendors</p>
        </div>
        <button className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors">
          Export all data
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#E5B35C] text-3xl font-serif mb-1">48</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2">Total Vendors</div>
          <div className="text-xs text-green-400">+3 this week</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#4ADE80] text-3xl font-serif mb-1">42</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2">Active Today</div>
          <div className="text-xs text-gray-500">87.5% uptime</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#E5B35C] text-3xl font-serif mb-1">1,247</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2">Orders Today</div>
          <div className="text-xs text-green-400">+18%</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#E5B35C] text-3xl font-serif mb-1">₹1.84L</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-2">Platform GMV Today</div>
          <div className="text-xs text-green-400">+22%</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#E5B35C] text-3xl font-serif mb-1">₹2.3L</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">MRR (Subscriptions)</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#3b82f6] text-3xl font-serif mb-1">68%</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">UPI Payments</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#E5B35C] text-3xl font-serif mb-1">32%</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Cash Payments</div>
        </div>
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-5">
          <div className="text-[#EF4444] text-3xl font-serif mb-1">4</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Inactive Vendors</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">7-Day GMV Trend</h3>
          <div className="h-48 flex items-end justify-between gap-2 border-b border-[#1F2330] pb-2">
            {[40, 45, 42, 50, 65, 80, 75].map((h, i) => (
              <div key={i} className="flex-1 bg-[#E55B3C]/20 hover:bg-[#E55B3C]/40 transition-colors" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span>
          </div>
        </div>

        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Top Vendors by GMV Today</h3>
          <div className="flex flex-col gap-4">
            {MOCK_VENDORS.slice(0, 5).map((v, i) => (
              <div key={v.id} className="flex justify-between items-center border-b border-[#1F2330] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#1A1D24] text-[#E5B35C] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="text-sm text-gray-200">{v.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white font-bold">₹{v.gmv.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">{v.orders} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVendors = () => (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">Vendors</h1>
          <p className="text-xs text-gray-500">48 street food vendors on Pabee</p>
        </div>
        <button className="bg-[#E5B35C] text-[#0B0E14] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#d4a24b] transition-colors">
          + Onboard vendor
        </button>
      </div>

      <div className="flex gap-4 border-b border-[#1F2330] pb-4">
        <button className="bg-[#E55B3C]/10 text-[#E55B3C] px-4 py-1.5 rounded-full text-xs font-bold border border-[#E55B3C]/30">All vendors</button>
        <button className="text-gray-400 px-4 py-1.5 text-xs font-medium hover:text-white">Vendor profile</button>
      </div>

      <input 
        type="text" 
        placeholder="Search vendors by name, city, phone..." 
        className="w-full bg-[#13161F] border border-[#1F2330] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#E5B35C]"
      />

      <div className="flex flex-col gap-3">
        {MOCK_VENDORS.map(v => (
          <div key={v.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-4 flex items-center justify-between hover:border-gray-700 cursor-pointer transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1A1D24] rounded-lg flex items-center justify-center text-xl">🍲</div>
              <div>
                <h4 className="text-sm font-bold text-gray-200">{v.name}</h4>
                <p className="text-xs text-gray-500">{v.loc} · Joined {v.joined}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-sm text-white font-bold">₹{v.gmv.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">{v.orders} orders</div>
              </div>
              <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${v.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {v.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">All orders</h1>
          <p className="text-xs text-gray-500">Platform-wide · All vendors · Filterable</p>
        </div>
        <button className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors">
          Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-2">
        {['All vendors', 'All statuses', 'Last 7 days', 'UPI only'].map(f => (
          <select key={f} className="bg-[#13161F] border border-[#1F2330] text-gray-300 text-xs px-3 py-2 rounded-lg outline-none">
            <option>{f}</option>
          </select>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_ORDERS.map(o => (
          <div key={o.id} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-gray-500">{o.id}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  o.status === 'ready' ? 'bg-green-500/20 text-green-400' : 
                  o.status === 'preparing' ? 'bg-blue-500/20 text-blue-400' : 
                  o.status === 'done' ? 'bg-gray-700 text-gray-300' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{o.status}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#3D2C1D] text-[#E5B35C]">{o.pay}</span>
              </div>
              <h4 className="text-sm font-bold text-gray-200">{o.vendor}</h4>
              <p className="text-xs text-gray-500">{o.items} · {o.time}</p>
            </div>
            <div className="text-lg font-bold text-white">₹{o.price}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">Platform analytics</h1>
        <p className="text-xs text-gray-500">Vendor-wise · Item-wise · Hourly · Trends</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Most Popular Dish Types (Platform)</h3>
          <div className="space-y-4">
            {[
              { n: 'Pav Bhaji / variants', v: 8420, p: 28 },
              { n: 'Chaat (bhel, sev, dahi)', v: 7200, p: 24 },
              { n: 'Vada Pav', v: 5400, p: 18 },
              { n: 'Drinks (chai, juice)', v: 4800, p: 16 },
              { n: 'Other snacks', v: 4200, p: 14 }
            ].map(d => (
              <div key={d.n}>
                <div className="flex justify-between text-xs text-gray-300 mb-1"><span>{d.n}</span><span className="text-gray-500">{d.v} orders · {d.p}%</span></div>
                <div className="w-full bg-[#1A1D24] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#E55B3C] h-full rounded-full" style={{ width: `${d.p * 2}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Hourly Order Volume (Today)</h3>
          <div className="h-40 flex items-end justify-between gap-1 border-b border-[#1F2330] pb-2">
            {[5, 10, 15, 30, 45, 60, 40, 20, 25, 40, 65, 80, 90, 70, 50, 20, 10, 5].map((h, i) => (
              <div key={i} className="flex-1 bg-[#E55B3C]/20 hover:bg-[#E55B3C]/50 transition-colors" style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>9AM</span><span>12</span><span>3PM</span><span>6PM</span><span>9PM</span><span>Now</span>
          </div>
        </div>

        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Month-Over-Month Growth</h3>
          <div className="flex flex-col gap-4">
            {['Feb 2025', 'Mar 2025', 'Apr 2025'].map(m => (
              <div key={m} className="flex justify-between items-center text-sm border-b border-[#1F2330] pb-3">
                <span className="text-gray-300">{m}</span><span className="text-green-400 font-bold">+{Math.floor(Math.random() * 20 + 10)}%</span>
              </div>
            ))}
             <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">May 2025</span><span className="text-green-400 font-bold">+28% ↑ est.</span>
              </div>
          </div>
        </div>

        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Most Active Vendors (This Week)</h3>
          <div className="flex flex-col gap-4">
            {MOCK_VENDORS.slice(0, 5).map(v => (
              <div key={v.id} className="flex justify-between items-center border-b border-[#1F2330] pb-3 last:border-0 last:pb-0 text-sm">
                <span className="text-gray-200 flex items-center gap-2"><span className="text-lg">🍲</span> {v.name}</span>
                <span className="text-[#E5B35C] font-bold">{v.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">Activity logs</h1>
          <p className="text-xs text-gray-500">All critical actions across platform</p>
        </div>
        <button className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm hover:text-white hover:border-gray-400 transition-colors">
          Export logs
        </button>
      </div>

      <div className="flex gap-3 mb-2">
        <select className="bg-[#13161F] border border-[#1F2330] text-gray-300 text-xs px-3 py-2 rounded-lg outline-none"><option>All action types</option></select>
        <select className="bg-[#13161F] border border-[#1F2330] text-gray-300 text-xs px-3 py-2 rounded-lg outline-none"><option>All vendors</option></select>
      </div>

      <div className="flex flex-col gap-2">
        {MOCK_LOGS.map((log, i) => (
          <div key={i} className="bg-[#13161F] border border-[#1F2330] rounded-xl p-4 flex justify-between items-center">
            <div className="flex items-start gap-4">
              <div className={`mt-1.5 w-2 h-2 rounded-full ${log.tag === 'price' ? 'bg-orange-400' : log.tag === 'offer' ? 'bg-green-400' : log.tag === 'admin' ? 'bg-red-400' : 'bg-gray-400'}`}></div>
              <div>
                <h4 className="text-sm text-gray-200 font-bold">{log.vendor} — {log.action}</h4>
                <p className="text-xs text-gray-500">{log.desc} · {log.time}</p>
              </div>
            </div>
            <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${log.color}`}>{log.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-3xl font-serif text-[#E55B3C] mb-1">Platform settings</h1>
        <p className="text-xs text-gray-500">Subscription pricing · Feature flags · SMS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Tier 1 Subscription Pricing</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="flex justify-between pb-3 border-b border-[#1F2330]"><span>Monthly plan</span><span className="font-bold text-white">₹999/mo</span></div>
            <div className="flex justify-between pb-3 border-b border-[#1F2330]"><span>Annual plan</span><span className="font-bold text-white">₹9,999/yr</span></div>
            <div className="flex justify-between pb-4"><span>Free trial period</span><span className="font-bold text-white">14 days</span></div>
            <button className="w-full bg-transparent border border-gray-600 text-gray-300 py-2 rounded-lg text-sm hover:text-white transition-colors">Edit pricing</button>
          </div>
        </div>

        <div className="bg-[#13161F] border border-[#1F2330] rounded-xl p-6">
          <h3 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-6">Feature Flags</h3>
          <div className="space-y-4">
            {['OTP verification', 'UPI payments', 'Customer SMS on ready', 'Branding studio', 'Offers & promotions', 'Vendor branding studio'].map((flag) => (
              <div key={flag} className="flex justify-between items-center pb-3 border-b border-[#1F2330] last:border-0 last:pb-0">
                <span className="text-sm text-gray-300">{flag}</span>
                <div className="w-10 h-5 bg-[#4ADE80] rounded-full p-0.5 flex items-center justify-end shadow-inner cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0E14] font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#13161F] border-r border-[#1F2330] hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-[#1F2330]">
          <h2 className="text-xl font-bold text-[#E55B3C] font-serif tracking-wide">pabee <span className="font-sans text-sm text-gray-400">admin</span></h2>
          <p className="text-xs text-gray-500 mt-1">Street food platform</p>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-2 mt-2">Platform</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-[#E55B3C]/10 text-[#E55B3C]' 
                  : 'text-gray-400 hover:bg-[#1A1D24] hover:text-gray-200'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'vendors' && renderVendors()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'logs' && renderLogs()}
        {activeTab === 'settings' && renderSettings()}
      </main>

    </div>
  );
}