import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  prep: string;
  veg: boolean;
  available?: boolean;
  badgeLabel?: string | null;
  imageUrl?: string | null;
  description?: string | null;
}

interface VendorProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string;
  themeMode: 'dark' | 'light';
  fontFamily: string;
  buttonRoundness: string;
  showOfferStrip?: boolean;
  offerText?: string;
}

// 🎨 Prototype deterministic pastel palette for dishes without photos
const TINTS = ['#F6E7D3', '#F3DCCB', '#EAE3C8', '#E3EBD5', '#F1D9D4', '#E8DFD0'];
const getTint = (id: string) => {
  const hash = [...(id || 'x')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TINTS[hash % TINTS.length];
};

export default function CustomerMenu({
  vendorId,
  onGoToCheckout,
}: {
  vendorId: string;
  onGoToCheckout: () => void;
}) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [showMenuSheet, setShowMenuSheet] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const { cart, addToCart, updateQty, cartCount, cartTotal, clearCart } = useCart();
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [activePromo, setActivePromo] = useState<any | null>(null);

  // 🧠 ACTIVE ORDER TRACKING STATES
  const [activeOrderId, setActiveOrderId] = useState(localStorage.getItem('activeOrderId') || null);
  const [activeOrderToken] = useState(localStorage.getItem('activeOrderToken') || null);
  const [orderStatus, setOrderStatus] = useState(localStorage.getItem('activeOrderStatus') || 'pending');

  // 🛡️ PREVENT CROSS-RESTAURANT CART CONTAMINATION
  useEffect(() => {
    const lastVisitedVendor = localStorage.getItem('pabee_last_vendor');
    if (lastVisitedVendor && lastVisitedVendor !== vendorId) {
      clearCart();
    }
    localStorage.setItem('pabee_last_vendor', vendorId);
  }, [vendorId, clearCart]);

  // 🔄 5-SECOND ORDER STATUS & MENU AVAILABILITY POLLING
  useEffect(() => {
    if (!activeOrderId) return;

    const checkStatus = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';
        const res = await fetch(`${API_URL}/api/orders/${activeOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          // Support both kitchenStatus and status so cancellations never desync
          const nextStatus =
            data.status === 'cancelled' || data.kitchenStatus === 'cancelled' || data.status === 'rejected'
              ? 'cancelled'
              : data.kitchenStatus || data.status;

          if (nextStatus) {
            setOrderStatus(nextStatus);
            localStorage.setItem('activeOrderStatus', nextStatus);
          }
        }
      } catch (err) {
        console.error('Tracker polling failed');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeOrderId]);

  // 🔔 CUSTOMER WAKE-UP ALARM
  useEffect(() => {
    if (!activeOrderId) return;
    const ringKey = `pabee_rung_${activeOrderId}`;

    if (orderStatus === 'completed' || orderStatus === 'ready') {
      const alreadyRung = localStorage.getItem(ringKey);
      if (!alreadyRung) {
        try {
          const alarm = new Audio('/bell.wav');
          alarm.play().catch((e) => console.warn('Audio blocked by browser', e));
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
          localStorage.setItem(ringKey, 'true');
        } catch (err) {
          console.error('Alarm execution failed', err);
        }
      }
    }
  }, [orderStatus, activeOrderId]);

  // 📜 ORDER HISTORY FILTER ("Your Usual")
  useEffect(() => {
    try {
      const rawData = localStorage.getItem('pabee_order_history');
      const rawHistory = JSON.parse(rawData || '[]');
      const safeHistory = Array.isArray(rawHistory) ? rawHistory : [];
      const thisVendorHistory = safeHistory.filter((order: any) => order.vendorId === vendorId);
      setPastOrders(thisVendorHistory);
    } catch (error) {
      setPastOrders([]);
    }
  }, [vendorId]);

  // 📦 FETCH PROFILE, MENU & PROMOS (plus background refresh for Auto-86)
  useEffect(() => {
    let realDbIdRef: string | null = null;
    const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

    const fetchMenuOnly = async (dbId: string) => {
      try {
        const menuRes = await fetch(`${API_URL}/api/vendors/${dbId}/menu`);
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenu(menuData.items && Array.isArray(menuData.items) ? menuData.items : []);
        }
      } catch (e) {
        // silent background sync
      }
    };

    const fetchData = async () => {
      try {
        const profileRes = await fetch(`${API_URL}/api/vendors/${vendorId}/profile`);
        if (!profileRes.ok) {
          setLoading(false);
          return;
        }

        const profileData = await profileRes.json();
        setVendorProfile({
          id: profileData.id,
          name: profileData.name || 'Your Store',
          logoUrl: profileData.logoUrl || null,
          bannerUrl: profileData.bannerUrl || null,
          accentColor: profileData.accentColor || '#E5B35C',
          themeMode: profileData.themeMode || 'dark',
          fontFamily: profileData.fontFamily || 'font-sans',
          buttonRoundness: profileData.buttonRoundness || 'rounded-xl',
          showOfferStrip: profileData.showOfferStrip || false,
          offerText: profileData.offerText || '',
        });

        const realDbId = profileData.id;
        realDbIdRef = realDbId;

        await fetchMenuOnly(realDbId);

        const promoRes = await fetch(`${API_URL}/api/vendors/${realDbId}/promos`);
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          const active = promoData.promos?.find((p: any) => {
            const isNotExpired =
              !p.expiresAt || new Date(new Date(p.expiresAt).setHours(23, 59, 59, 999)) >= new Date();
            return p.isActive && isNotExpired;
          });
          setActivePromo(active || null);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Sync menu availability every 15s so Auto-86 updates live
    const menuSync = setInterval(() => {
      if (realDbIdRef) fetchMenuOnly(realDbIdRef);
    }, 15000);

    return () => clearInterval(menuSync);
  }, [vendorId]);

  // 🧮 DERIVED CATEGORIES, FILTERED ITEMS & PREP PULSE
  const categories = useMemo(() => {
    const rawCats = [...new Set(menu.map((item) => item.category).filter(Boolean))];
    return ['All', ...rawCats];
  }, [menu]);

  const displayedItems = useMemo(() => {
    return menu
      .filter((item) => {
        if (vegOnly && !item.veg) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.category && item.category.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
          );
        }
        if (activeCategory !== 'All' && item.category !== activeCategory) return false;
        return true;
      })
      // Sort available items first, sold-out items at the bottom of the list (like prototype)
      .sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0));
  }, [menu, vegOnly, searchQuery, activeCategory]);

  // Prototype live prep range
  const prepRange = useMemo(() => {
    const preps = menu.map((m) => parseInt(m.prep, 10)).filter((n) => !isNaN(n) && n > 0);
    const avg = preps.length ? Math.round(preps.reduce((a, b) => a + b, 0) / preps.length) : 8;
    const lo = Math.max(3, Math.round(avg * 0.8));
    const hi = Math.max(lo + 2, Math.round(avg * 1.25));
    return `${lo}–${hi}`;
  }, [menu]);

  // Prototype 1-Tap Upsell Suggestion Engine
  const delta = activePromo ? activePromo.minOrderValue - cartTotal : 0;
  const showNudge = cartCount > 0 && activePromo && delta > 0;
  const nudgeSuggestion = useMemo(() => {
    if (!showNudge) return null;
    const candidates = menu
      .filter((m) => m.available !== false && (!vegOnly || m.veg) && m.price >= delta)
      .sort((a, b) => a.price - b.price);
    return candidates[0] || null;
  }, [showNudge, menu, vegOnly, delta]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121110] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-[#26231F] border-t-[#E5B35C] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[#9A9184]">Loading menu…</p>
      </div>
    );
  }

  if (!vendorProfile) {
    return (
      <div className="min-h-screen bg-[#121110] text-[#F5F0E8] flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-xl bg-[#26231F] text-[#9A9184] font-bold text-2xl grid place-items-center mb-4">
          ?
        </div>
        <h2 className="text-xl font-semibold mb-1">Menu Not Found</h2>
        <p className="text-[#C7BFB2] text-sm max-w-xs">
          We couldn't locate this shop. Please scan the table QR code again.
        </p>
      </div>
    );
  }

  // 🎨 Prototype Paper / Dark Theme Tokens
  const isDark = vendorProfile.themeMode === 'dark';
  const accent = vendorProfile.accentColor || '#E5B35C';
  const themeVars = isDark
    ? {
        bg: 'bg-[#121110]',
        surface: 'bg-[#1C1A18]',
        surface2: 'bg-[#26231F]',
        border: 'border-[#3A352E]',
        text1: 'text-[#F5F0E8]',
        text2: 'text-[#C7BFB2]',
        text3: 'text-[#9A9184]',
        successFill: 'bg-[#15291B]',
        successText: 'text-[#5CC97B]',
      }
    : {
        bg: 'bg-[#FFFBF5]',
        surface: 'bg-[#FFFFFF]',
        surface2: 'bg-[#F6F0E6]',
        border: 'border-[#E7DED0]',
        text1: 'text-[#1C1A17]',
        text2: 'text-[#5C554B]',
        text3: 'text-[#7A7266]',
        successFill: 'bg-[#E7F4EA]',
        successText: 'text-[#146C31]',
      };

  const isOrderCancelled = orderStatus === 'cancelled' || orderStatus === 'rejected';
  const isOrderDone = orderStatus === 'completed' || orderStatus === 'ready';
  const promoProgress = activePromo
    ? Math.min(100, Math.round((cartTotal / activePromo.minOrderValue) * 100))
    : 100;

  return (
    <div className={`min-h-screen ${themeVars.bg} ${themeVars.text1} pb-36 ${vendorProfile.fontFamily} transition-colors`}>
      <div className="max-w-xl mx-auto">
        
        {/* 1. PROTOTYPE COMPACT BRAND HEADER (`d-head`) */}
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl font-extrabold text-2xl grid place-items-center shrink-0 overflow-hidden shadow-sm"
              style={{ backgroundColor: accent, color: '#1A1206' }}
            >
              {vendorProfile.logoUrl ? (
                <img src={vendorProfile.logoUrl} alt={vendorProfile.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(vendorProfile.name || 'P')[0]?.toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] leading-[26px] font-semibold truncate">{vendorProfile.name}</h1>
              <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-xs font-semibold mt-1 ${themeVars.surface2}`}>
                Dine-In / Counter Order
              </span>
            </div>
          </div>

          {/* Live Kitchen Readiness Pulse */}
          <div className={`flex items-center gap-2 text-sm mt-3 ${themeVars.text2}`}>
            <span className="w-2 h-2 rounded-full bg-[#146C31] dark:bg-[#5CC97B] shrink-0" />
            <span>Open · ready in about {prepRange} min</span>
          </div>

          {/* Search Bar + Veg Switch (`d-search`) */}
          <div className="flex gap-2.5 items-center mt-3">
            <label className={`flex-1 h-11 rounded-lg ${themeVars.surface2} flex items-center gap-2 px-3 ${themeVars.text3} focus-within:ring-2 focus-within:ring-[#E5B35C]`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search '${menu[0]?.name || 'dishes'}'`}
                className={`border-0 bg-transparent text-base flex-1 min-w-0 h-full outline-none ${themeVars.text1} placeholder:${themeVars.text3}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs font-bold px-1">
                  ✕
                </button>
              )}
            </label>

            {/* Sliding Veg Switch */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              aria-pressed={vegOnly}
              className="flex items-center gap-1.5 text-[13px] font-semibold min-h-[44px] shrink-0"
            >
              <span
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  vegOnly ? 'bg-[#0F8A3C]' : isDark ? 'bg-[#3A352E]' : 'bg-[#E7DED0]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    vegOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
              <span>Veg</span>
            </button>
          </div>
        </header>

        {/* 2. AUTOMATIC OFFER BANNER (`offer`) */}
        {(activePromo || (vendorProfile.showOfferStrip && vendorProfile.offerText)) && (
          <div className={`mx-4 mt-1 min-h-[44px] rounded-xl ${themeVars.successFill} ${themeVars.successText} flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span>
              {activePromo
                ? `${activePromo.type === 'FLAT' ? `₹${activePromo.value}` : `${activePromo.value}%`} off above ₹${activePromo.minOrderValue} · Use code ${activePromo.code}`
                : vendorProfile.offerText}
            </span>
          </div>
        )}

        {/* 3. FIXED LIVE ORDER TRACKER (Handles Pending, Preparing, Completed AND Cancelled) */}
        {activeOrderId && (
          <div className="px-4 mt-3">
            <div className={`rounded-xl p-4 border ${themeVars.surface} ${themeVars.border} flex items-center justify-between shadow-sm`}>
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${themeVars.text3}`}>
                  Order Token
                </span>
                <span className="text-3xl font-extrabold leading-none mt-1" style={{ color: isOrderCancelled ? '#EF4444' : accent }}>
                  #{activeOrderToken}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end text-right">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${themeVars.text3}`}>
                    Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOrderCancelled
                          ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                          : isOrderDone
                          ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse'
                          : 'bg-[#E5B35C] shadow-[0_0_8px_#E5B35C] animate-pulse'
                      }`}
                    />
                    <span
                      className={`text-sm font-bold ${
                        isOrderCancelled ? 'text-red-500' : isOrderDone ? 'text-green-500' : ''
                      }`}
                    >
                      {(orderStatus === 'pending' || orderStatus === 'received') && 'Sent to Kitchen'}
                      {orderStatus === 'preparing' && 'Preparing on stove 🔥'}
                      {isOrderDone && 'Ready! Collect at counter ✅'}
                      {isOrderCancelled && 'Order Cancelled by Shop'}
                    </span>
                  </div>
                </div>

                {/* Allow customer to dismiss when completed OR cancelled */}
                {(isOrderDone || isOrderCancelled) && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('activeOrderId');
                      localStorage.removeItem('activeOrderToken');
                      localStorage.removeItem('activeOrderStatus');
                      setActiveOrderId(null);
                    }}
                    aria-label="Dismiss tracker"
                    className={`w-8 h-8 rounded-full ${themeVars.surface2} flex items-center justify-center font-bold text-base`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. STICKY CATEGORY BAR (`catbar`) */}
        {!searchQuery.trim() && (
          <nav
            aria-label="Categories"
            className={`sticky top-0 z-20 ${themeVars.bg} flex gap-2 overflow-x-auto px-4 py-3 border-b ${themeVars.border} mt-2 no-scrollbar`}
          >
            {categories.map((category) => {
              const isSelected = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`shrink-0 h-9 px-3.5 rounded-lg border text-sm font-semibold transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-[#F5F0E8] text-[#121110] border-[#F5F0E8]'
                        : 'bg-[#1C1A17] text-[#FFFBF5] border-[#1C1A17]'
                      : `${themeVars.surface} ${themeVars.border} ${themeVars.text1}`
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </nav>
        )}

        {/* 5. PROTOTYPE "YOUR USUAL" 1-TAP REORDER CARD (`usual`) */}
        {!searchQuery.trim() && pastOrders.length > 0 && (
          <div className={`mx-4 mt-4 p-4 rounded-xl border ${themeVars.border} ${themeVars.surface}`}>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">Your usual</span>
              <span className={`text-xs ${themeVars.text3}`}>
                {new Date(pastOrders[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className={`text-[15px] ${themeVars.text2} mt-0.5 mb-3 line-clamp-1`}>
              {pastOrders[0].summary}
            </div>
            <button
              onClick={() => {
                pastOrders[0].rawItems?.forEach((item: any) => addToCart(item));
                onGoToCheckout();
              }}
              style={{ backgroundColor: accent, color: '#1A1206' }}
              className="w-full h-11 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
            >
              Order usual · ₹{pastOrders[0].total}
            </button>
          </div>
        )}

        {/* 6. PROTOTYPE 2-COLUMN DISH ROWS (`dish`) */}
        <div className="divide-y divide-[#E7DED0] dark:divide-[#3A352E]">
          {displayedItems.length === 0 ? (
            <div className={`py-12 px-4 text-center ${themeVars.text2}`}>
              {searchQuery.trim() ? (
                <>
                  <p>No ‘{searchQuery}’ here. Try:</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {menu.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSearchQuery(m.name)}
                        className={`min-h-[40px] px-4 rounded-full border ${themeVars.border} ${themeVars.surface} font-semibold text-sm`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p>No dishes in this category right now.</p>
              )}
            </div>
          ) : (
            displayedItems.map((item) => {
              const isSoldOut = item.available === false;
              const cartItem = cart.find((c) => c.id === item.id);
              const qty = cartItem ? cartItem.qty : 0;
              const prepMins = parseInt(item.prep, 10);
              const initial = (item.name || '?').trim()[0]?.toUpperCase();

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_96px] gap-3 px-4 pt-4 pb-[30px]"
                >
                  {/* Left Column: Marks, Title, Price, Quick/SoldOut */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
                      {/* Official FSSAI Veg / Non-Veg Symbol */}
                      <span
                        role="img"
                        aria-label={item.veg ? 'Veg' : 'Non-veg'}
                        className={`w-4 h-4 border-[1.5px] rounded-[2px] inline-grid place-items-center shrink-0 ${
                          item.veg ? 'border-[#0F8A3C]' : 'border-[#7A3E12]'
                        }`}
                      >
                        <span
                          className={
                            item.veg
                              ? 'w-[7px] h-[7px] rounded-full bg-[#0F8A3C]'
                              : 'w-[8px] h-[7px] bg-[#7A3E12] [clip-path:polygon(50%_0,100%_100%,0_100%)]'
                          }
                        />
                      </span>

                      {item.badgeLabel && (
                        <span className="h-[22px] px-2 rounded-[6px] text-xs font-semibold inline-flex items-center bg-[#FFF4DB] text-[#9A5B00] dark:bg-[#2E2410] dark:text-[#F2B33D]">
                          {item.badgeLabel}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setDetailItem(item)}
                      className="text-[17px] leading-[22px] font-semibold mt-1.5 mb-0.5 text-left block hover:underline"
                    >
                      {item.name}
                    </button>

                    <div className="text-[17px] leading-[22px] font-bold tabular-nums">
                      ₹{item.price}
                    </div>

                    {item.description && (
                      <p className={`text-xs ${themeVars.text2} line-clamp-2 mt-1 pr-2`}>
                        {item.description}
                      </p>
                    )}

                    {isSoldOut ? (
                      <div className={`text-sm font-semibold ${themeVars.text3} mt-1.5`}>
                        Sold out today · back tomorrow
                      </div>
                    ) : !isNaN(prepMins) && prepMins <= 5 ? (
                      <div className={`text-[13px] font-semibold ${themeVars.successText} mt-1.5`}>
                        Quick · {prepMins} min
                      </div>
                    ) : null}
                  </div>

                  {/* Right Column: 96x96 Tile + Overlapping Stepper (`media`) */}
                  <div className="relative w-24 h-24">
                    <button
                      onClick={() => setDetailItem(item)}
                      style={{ backgroundColor: getTint(item.id) }}
                      className={`w-24 h-24 rounded-xl grid place-items-center font-bold text-[32px] text-[#5C554B] overflow-hidden ${
                        isSoldOut ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </button>

                    {/* Overlapping Action Button at top: 78px */}
                    {!isSoldOut && (
                      <div className="absolute left-1/2 top-[78px] -translate-x-1/2 flex flex-col items-center">
                        {qty > 0 ? (
                          <div
                            style={{ backgroundColor: accent, color: '#1A1206' }}
                            className="w-24 h-9 rounded-lg flex items-center justify-between font-bold shadow-md tabular-nums"
                          >
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              aria-label="Remove one"
                              className="w-[34px] h-9 text-xl text-center active:scale-90"
                            >
                              −
                            </button>
                            <span className="text-sm">{qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              aria-label="Add one"
                              className="w-[34px] h-9 text-xl text-center active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            style={{ color: isDark ? accent : '#8A5A00' }}
                            className={`w-24 h-9 rounded-lg ${themeVars.surface} border ${themeVars.border} font-bold text-base shadow-sm active:scale-95 transition-transform text-center`}
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. FLOATING "☰ Menu" CATEGORY BUTTON (`fmenu`) */}
      {!searchQuery.trim() && categories.length > 2 && (
        <button
          onClick={() => setShowMenuSheet(true)}
          style={{ bottom: cartCount > 0 ? (showNudge ? '136px' : '92px') : '20px' }}
          className={`fixed right-4 z-30 h-12 px-4 rounded-full font-semibold text-sm shadow-xl flex items-center gap-1.5 transition-all ${
            isDark ? 'bg-[#F5F0E8] text-[#121110]' : 'bg-[#1C1A17] text-[#FFFBF5]'
          }`}
        >
          <span>☰</span>
          <span>Menu</span>
        </button>
      )}

      {/* 8. PROTOTYPE BOTTOM CART BAR + 1-TAP UPSELL NUDGE (`cbw` + `nudge` + `cartbar`) */}
      {cartCount > 0 && (
        <div className="fixed left-0 right-0 bottom-0 px-3 pb-3 z-40 max-w-xl mx-auto">
          {showNudge && (
            <div className={`mx-2 min-h-[42px] rounded-t-xl border border-b-0 ${themeVars.border} ${themeVars.surface} flex items-center justify-between gap-2 px-3 py-1.5 text-sm shadow-md`}>
              {nudgeSuggestion ? (
                <>
                  <span className="truncate">
                    Add <b>{nudgeSuggestion.name}</b> (₹{nudgeSuggestion.price}) →{' '}
                    {activePromo.type === 'FLAT' ? `₹${activePromo.value}` : `${activePromo.value}%`} off unlocked
                  </span>
                  <button
                    onClick={() => addToCart(nudgeSuggestion)}
                    className={`min-h-[32px] px-3 rounded-lg font-semibold text-xs shrink-0 ${
                      isDark ? 'bg-[#F5F0E8] text-[#121110]' : 'bg-[#1C1A17] text-[#FFFBF5]'
                    }`}
                  >
                    + Add
                  </button>
                </>
              ) : (
                <span>
                  Add ₹{delta} more to get{' '}
                  {activePromo.type === 'FLAT' ? `₹${activePromo.value}` : `${activePromo.value}%`} off
                </span>
              )}
            </div>
          )}

          <button
            onClick={onGoToCheckout}
            style={{ backgroundColor: accent, color: '#1A1206' }}
            className="relative w-full h-16 rounded-xl flex items-center justify-between px-4 text-base font-bold shadow-2xl overflow-hidden tabular-nums active:scale-[0.99] transition-transform"
          >
            {/* Top Offer Progress Track */}
            {activePromo && (
              <>
                <span className="absolute left-0 right-0 top-0 h-1 bg-[#1A1206] opacity-20" />
                <span
                  style={{ width: `${promoProgress}%` }}
                  className="absolute left-0 top-0 h-1 bg-[#1A1206] opacity-85 transition-all duration-300"
                />
              </>
            )}

            <span>
              {cartCount === 1 ? '1 item' : `${cartCount} items`} · ₹{cartTotal}
            </span>
            <span>View cart →</span>
          </button>
        </div>
      )}

      {/* 9. DISH DETAIL BOTTOM SHEET (`detail`) */}
      {detailItem && (
        <div
          onClick={() => setDetailItem(null)}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl ${themeVars.surface} rounded-t-[20px] p-4 pb-6 max-h-[85vh] overflow-auto`}
          >
            <div className={`w-9 h-1 rounded-full ${themeVars.border} bg-current mx-auto mb-3 opacity-30`} />
            <div
              style={{ backgroundColor: getTint(detailItem.id) }}
              className="w-full h-44 rounded-xl grid place-items-center font-bold text-6xl text-[#5C554B] mb-3 overflow-hidden"
            >
              {detailItem.imageUrl ? (
                <img src={detailItem.imageUrl} alt={detailItem.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(detailItem.name || '?')[0]?.toUpperCase()}</span>
              )}
            </div>

            <h3 className="text-xl font-semibold">{detailItem.name}</h3>
            {detailItem.description && (
              <p className={`text-sm ${themeVars.text2} mt-1.5`}>{detailItem.description}</p>
            )}
            <p className="text-lg font-bold mt-2.5 tabular-nums">₹{detailItem.price}</p>

            {detailItem.available === false ? (
              <p className={`text-sm font-semibold ${themeVars.text3} mt-3`}>
                Sold out today · back tomorrow
              </p>
            ) : (
              <button
                onClick={() => {
                  addToCart(detailItem);
                  setDetailItem(null);
                }}
                style={{ backgroundColor: accent, color: '#1A1206' }}
                className="w-full h-[52px] rounded-xl font-semibold text-[17px] mt-4"
              >
                Add · ₹{detailItem.price}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 10. QUICK CATEGORY JUMP SHEET (`menusheet`) */}
      {showMenuSheet && (
        <div
          onClick={() => setShowMenuSheet(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl ${themeVars.surface} rounded-t-[20px] p-4 pb-6 max-h-[75vh] overflow-auto`}
          >
            <div className="w-9 h-1 rounded-full bg-gray-400/40 mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">Menu</h3>
            <div className={`divide-y ${themeVars.border}`}>
              {categories.map((cat) => {
                const count =
                  cat === 'All'
                    ? menu.filter((i) => !vegOnly || i.veg).length
                    : menu.filter((i) => i.category === cat && (!vegOnly || i.veg)).length;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setShowMenuSheet(false);
                    }}
                    className="w-full min-h-[52px] flex items-center justify-between text-base font-semibold"
                  >
                    <span>{cat}</span>
                    <span className={`tabular-nums ${themeVars.text3}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}