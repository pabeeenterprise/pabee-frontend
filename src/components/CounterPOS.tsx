import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  veg?: boolean;
  available?: boolean;
  code?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface RecentOrder {
  label: string;
  items: CartItem[];
  total: number;
}

export default function CounterPOS({ vendorId }: { vendorId: string }) {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'https://pabee-backend-asia.onrender.com';

  // Menu & Settings
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [upiId, setUpiId] = useState('');
  const [shopName, setShopName] = useState('Your Stall');
  const [isLoading, setIsLoading] = useState(true);

  // POS State Machine: 'build' | 'cash' | 'change' | 'upi' | 'done'
  const [step, setStep] = useState<'build' | 'cash' | 'change' | 'upi' | 'done'>('build');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  // Cart & Modifiers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('top');
  const [isParcel, setIsParcel] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showDiscountSheet, setShowDiscountSheet] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Cash Calculation
  const [cashGiven, setCashGiven] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real session recent orders only (no fake hardcoded menu IDs)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Menu, UPI Payment Settings & Stall Name
  useEffect(() => {
    const initPOS = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [menuRes, paymentRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/api/vendors/${vendorId}/menu-editor`, { headers }),
          fetch(`${API_URL}/api/vendors/${vendorId}/payment`, { headers }),
          fetch(`${API_URL}/api/vendors/${vendorId}/profile`),
        ]);

        if (menuRes.ok) {
          const menuData = await menuRes.json();
          const processedMenu = (menuData.items || []).map((m: MenuItem) => {
            const words = m.name.trim().split(/\s+/);
            const shortcut =
              words.length >= 2
                ? `${words[0][0]}${words[1][0]}`.toUpperCase()
                : m.name.slice(0, 2).toUpperCase();
            return { ...m, code: m.code || shortcut };
          });
          setMenu(processedMenu);
        }

        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          if (paymentData.upiId) setUpiId(paymentData.upiId);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.name) setShopName(profileData.name);
        }
      } catch (err) {
        console.error('Failed to initialize POS', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (vendorId) initPOS();
  }, [vendorId, API_URL, getToken]);

  // Calculations
  const rawSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );
  const totalItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );
  const packingFee = isParcel ? 10 : 0;
  const safeDiscount = Math.min(discountAmount, rawSubtotal);
  const finalTotal = Math.max(0, rawSubtotal - safeDiscount + packingFee);

  // Categories
  const categories = useMemo(() => {
    const rawCats = [...new Set(menu.map((m) => m.category).filter(Boolean))];
    return ['top', ...rawCats];
  }, [menu]);

  // Code Hit Detection (e.g. typing "VP" selects Vada Pav)
  const codeHit = useMemo(() => {
    const q = searchCode.trim().toUpperCase();
    if (!q) return null;
    return menu.find((m) => m.code === q && m.available !== false) || null;
  }, [searchCode, menu]);

  // Filtered Menu Items
  const displayedItems = useMemo(() => {
    if (searchCode.trim()) {
      const q = searchCode.trim().toLowerCase();
      return menu.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.code && m.code.toLowerCase().startsWith(q))
      );
    }
    if (selectedCategory === 'top') {
      return menu.filter((m) => m.available !== false).slice(0, 9);
    }
    return menu.filter((m) => m.category === selectedCategory);
  }, [menu, selectedCategory, searchCode]);

  // Cart Operations
  const addItemToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
    setSearchCode('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const clearPOS = () => {
    setCart([]);
    setCustomerName('');
    setShowNameInput(false);
    setIsParcel(false);
    setDiscountAmount(0);
    setSearchCode('');
    setCashGiven(0);
  };

  // Submit Counter Order to Authenticated Staff Endpoint
  const submitOrder = async (mode: 'CASH' | 'UPI', paidCashAmount = 0) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const payload = {
        tableId: isParcel ? 'Parcel' : 'Counter',
        customerName: customerName.trim() || 'Counter Walk-up',
        customerPhone: '0000000000',
        paymentMode: mode,
        packIt: isParcel,
        manualDiscount: safeDiscount,
        items: cart.map((c) => ({ menuItemId: c.id, name: c.name, qty: c.qty })),
      };

      const res = await fetch(`${API_URL}/api/vendors/${vendorId}/counter-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to place order');
        setIsSubmitting(false);
        return;
      }

      const tokenNum = String(data.tokenNumber || '1');
      const serverTotal = typeof data.total === 'number' ? data.total : finalTotal;
      setCreatedToken(tokenNum);

      // Add to recent orders strip using real DB items
      const newRecent: RecentOrder = {
        label: cart.map((c) => (c.qty > 1 ? `${c.qty}× ${c.name}` : c.name)).join(' + '),
        total: serverTotal,
        items: [...cart],
      };
      setRecentOrders((prev) => [newRecent, ...prev.slice(0, 4)]);

      // Use paidCashAmount parameter directly (avoids React setState lag)
      if (mode === 'CASH') {
        const changeDue = paidCashAmount - serverTotal;
        if (changeDue > 0) {
          setStep('change');
        } else {
          setStep('done');
        }
      } else {
        setStep('done');
      }
    } catch {
      toast.error('Network failure submitting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#9A9184] font-semibold text-sm">
        Loading Counter Terminal…
      </div>
    );
  }

  // ==========================================
  // STEP 2: CASH GIVEN SELECTION
  // ==========================================
  if (step === 'cash') {
    const cashOptions = [finalTotal, 50, 100, 200, 500, 2000].filter(
      (n, idx, arr) => n >= finalTotal && arr.indexOf(n) === idx
    );

    return (
      <div className="p-4 max-w-md mx-auto space-y-4 font-sans text-[#F5F0E8]">
        <button
          onClick={() => setStep('build')}
          className="min-h-[40px] px-4 rounded-full border border-[#3A352E] bg-[#1C1A18] text-sm font-semibold"
        >
          ← Back
        </button>

        <div className="bg-[#1C1A18] border border-[#3A352E] rounded-xl p-5 text-center">
          <div className="text-xs uppercase font-bold text-[#9A9184] tracking-wider">To pay</div>
          <div className="text-4xl font-extrabold text-[#E5B35C] tabular-nums mt-1">
            ₹{finalTotal}
          </div>
        </div>

        <h3 className="text-base font-semibold pt-2">Customer gave</h3>

        <div className="grid grid-cols-2 gap-2">
          {cashOptions.map((amt) => (
            <button
              key={amt}
              disabled={isSubmitting}
              onClick={() => {
                setCashGiven(amt);
                submitOrder('CASH', amt);
              }}
              className="min-h-[64px] rounded-xl border border-[#3A352E] bg-[#1C1A18] font-bold text-xl tabular-nums hover:border-[#E5B35C] active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
            >
              {amt === finalTotal ? `₹${amt} exact` : `₹${amt}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 3: CHANGE RETURN SCREEN
  // ==========================================
  if (step === 'change') {
    const returnChange = Math.max(0, cashGiven - finalTotal);

    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center font-sans text-[#F5F0E8] space-y-3">
        <div className="text-sm font-semibold text-[#9A9184]">
          Token #{createdToken} · Customer gave ₹{cashGiven}
        </div>

        <div className="text-5xl font-black text-[#5CC97B] tabular-nums py-2">
          {returnChange > 0 ? `Return ₹${returnChange}` : 'Nothing to return'}
        </div>

        <div className="w-full max-w-xs pt-6">
          <button
            onClick={() => {
              clearPOS();
              setStep('build');
            }}
            className="w-full h-16 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-lg active:scale-95 transition-transform"
          >
            Next customer →
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 4: REAL SCANNABLE CUSTOMER UPI QR CODE
  // ==========================================
  if (step === 'upi') {
    const hasValidUpi = Boolean(upiId && upiId.includes('@'));
    const upiLink = hasValidUpi
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${finalTotal}&cu=INR`
      : '';

    return (
      <div className="p-4 max-w-md mx-auto space-y-4 font-sans text-[#F5F0E8]">
        <button
          onClick={() => setStep('build')}
          className="min-h-[40px] px-4 rounded-full border border-[#3A352E] bg-[#1C1A18] text-sm font-semibold"
        >
          ← Back
        </button>

        <div className="bg-[#1C1A18] border border-[#3A352E] rounded-2xl p-6 text-center flex flex-col items-center space-y-3 shadow-lg">
          <div className="text-xs uppercase font-bold text-[#9A9184] tracking-wider">
            Show this to the customer
          </div>

          {hasValidUpi ? (
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={upiLink} size={220} level="M" bgColor="#ffffff" fgColor="#1C1A17" />
            </div>
          ) : (
            <div className="w-[220px] h-[220px] rounded-xl bg-[#26231F] border border-amber-500/40 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-sm font-bold text-amber-400">No UPI ID Saved</span>
              <span className="text-xs text-[#9A9184] mt-1">
                Add your Merchant UPI ID in More → Payment Settings, or use your physical counter QR.
              </span>
            </div>
          )}

          <div className="font-bold text-base">{shopName}</div>
          <div className="text-3xl font-extrabold text-[#E5B35C] tabular-nums">
            ₹{finalTotal}
          </div>
          <div className="text-xs text-[#9A9184]">
            {hasValidUpi ? `Paying ${upiId}` : 'Verify payment on your soundbox/phone before confirming'}
          </div>
        </div>

        <button
          disabled={isSubmitting}
          onClick={() => submitOrder('UPI')}
          className="w-full h-14 rounded-xl bg-[#5CC97B] text-[#15291B] font-extrabold text-base active:scale-95 transition-transform disabled:opacity-40"
        >
          {isSubmitting ? 'Confirming…' : 'Customer Paid by UPI ✓'}
        </button>
      </div>
    );
  }

  // ==========================================
  // STEP 5: TOKEN ISSUED SCREEN
  // ==========================================
  if (step === 'done') {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center font-sans text-[#F5F0E8] space-y-2">
        <div className="text-sm font-semibold uppercase tracking-wider text-[#9A9184]">Token</div>
        <div className="text-9xl font-black text-[#E5B35C] tabular-nums leading-none">
          #{createdToken}
        </div>
        <div className="text-sm text-[#C7BFB2] pt-2">Order sent straight to kitchen grill 🔥</div>

        <div className="w-full max-w-xs pt-8">
          <button
            onClick={() => {
              clearPOS();
              setStep('build');
            }}
            className="w-full h-16 rounded-xl bg-[#E5B35C] text-[#1A1206] font-bold text-lg active:scale-95 transition-transform"
          >
            Next customer →
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 1: RAPID ORDER BUILD TERMINAL
  // ==========================================
  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#121110] text-[#F5F0E8] font-sans overflow-hidden">
      {/* LEFT COLUMN: Search, Recents, Tabs & Tile Grid */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden min-h-0">
        <div className="flex gap-2 shrink-0">
          <div className="flex-1 h-12 rounded-lg bg-[#26231F] border border-[#3A352E] flex items-center px-3 gap-2">
            <span className="text-[#9A9184]">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Code (e.g. VP) or dish name…"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeHit) {
                  addItemToCart(codeHit);
                }
              }}
              className="bg-transparent border-none outline-none text-sm text-white flex-1 min-w-0"
            />
            {searchCode && (
              <button onClick={() => setSearchCode('')} className="text-xs text-[#9A9184]">
                ✕
              </button>
            )}
          </div>
        </div>

        {codeHit && (
          <button
            onClick={() => addItemToCart(codeHit)}
            className="mt-2 min-h-[48px] rounded-lg bg-[#14223A] border border-[#7FB0F0]/30 text-[#7FB0F0] px-3 flex items-center justify-between text-sm font-semibold shrink-0"
          >
            <span>
              ⚡ <b>{codeHit.code}</b> → {codeHit.name}
            </span>
            <span className="text-xs">Tap or press Enter to add +</span>
          </button>
        )}

        {recentOrders.length > 0 && !searchCode && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 shrink-0">
            {recentOrders.map((ro, idx) => (
              <button
                key={idx}
                onClick={() => {
                  ro.items.forEach((it) => {
                    setCart((prev) => {
                      const ex = prev.find((c) => c.id === it.id);
                      if (ex) {
                        return prev.map((c) =>
                          c.id === it.id ? { ...c, qty: c.qty + it.qty } : c
                        );
                      }
                      return [...prev, { ...it }];
                    });
                  });
                }}
                className="shrink-0 min-h-[40px] px-3 rounded-full border border-[#3A352E] bg-[#1C1A18] text-xs font-semibold hover:border-[#E5B35C] active:scale-95 transition-all text-[#C7BFB2]"
              >
                {ro.label} · <b className="text-[#E5B35C]">₹{ro.total}</b>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => {
                setSelectedCategory(c);
                setSearchCode('');
              }}
              className={`min-h-[36px] px-3.5 rounded-lg border text-xs font-semibold shrink-0 transition-colors ${
                selectedCategory === c && !searchCode
                  ? 'bg-[#F5F0E8] text-[#121110] border-[#F5F0E8]'
                  : 'bg-[#1C1A18] border-[#3A352E] text-[#C7BFB2]'
              }`}
            >
              {c === 'top' ? 'Top sellers' : c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 pr-1 min-h-0">
          {displayedItems.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            const qty = inCart?.qty || 0;
            const isSoldOut = item.available === false;

            return (
              <button
                key={item.id}
                disabled={isSoldOut}
                onClick={() => addItemToCart(item)}
                className={`relative h-[88px] rounded-xl border p-2 flex flex-col justify-between text-left active:scale-[0.97] transition-transform ${
                  isSoldOut
                    ? 'opacity-40 bg-[#1C1A18] border-[#3A352E]'
                    : 'bg-[#1C1A18] border-[#3A352E] hover:border-[#E5B35C]'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 border-[1.5px] rounded-[2px] inline-grid place-items-center absolute top-2 right-2 shrink-0 ${
                    item.veg ? 'border-[#34B866]' : 'border-[#C77A45]'
                  }`}
                >
                  <span
                    className={
                      item.veg
                        ? 'w-1.5 h-1.5 rounded-full bg-[#34B866]'
                        : 'w-1.5 h-1.5 bg-[#C77A45] [clip-path:polygon(50%_0,100%_100%,0_100%)]'
                    }
                  />
                </span>

                <div className="text-[15px] leading-[19px] font-semibold text-white line-clamp-2 pr-4">
                  {item.name}
                </div>

                <div className="text-[15px] font-bold tabular-nums text-[#E5B35C]">
                  ₹{item.price}
                </div>

                {qty > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[28px] h-7 rounded-full bg-[#E5B35C] text-[#1A1206] font-bold text-sm grid place-items-center px-1.5 tabular-nums shadow-md">
                    {qty}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT REGISTER / BOTTOM DOCKED PANEL */}
      <div className="w-full lg:w-96 bg-[#1C1A18] border-t lg:border-t-0 lg:border-l border-[#3A352E] p-3 flex flex-col justify-between shrink-0 shadow-xl max-h-[50vh] lg:max-h-none overflow-y-auto">
        <div>
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="w-full flex items-center justify-between min-h-[44px] pb-2 border-b border-[#3A352E]"
          >
            <div className="text-left">
              <span className="text-xl font-bold tabular-nums">
                {totalItemsCount > 0 ? (
                  <>
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} · ₹{finalTotal}
                  </>
                ) : (
                  <span className="text-sm font-semibold text-[#7A7266]">
                    Tap dishes to add them
                  </span>
                )}
              </span>
              {safeDiscount > 0 && (
                <span className="text-xs text-[#5CC97B] font-bold ml-2">−₹{safeDiscount}</span>
              )}
            </div>
            <span className="text-sm font-bold text-[#7A7266] lg:hidden">
              {isPanelOpen ? '▾' : '▴'}
            </span>
          </button>

          <div
            className={`divide-y divide-[#3A352E]/60 max-h-48 overflow-y-auto pr-1 my-2 ${
              !isPanelOpen ? 'hidden lg:block' : 'block'
            }`}
          >
            {cart.map((c) => (
              <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <span className="font-semibold text-white block truncate">{c.name}</span>
                  <span className="text-[#9A9184]">₹{c.price * c.qty}</span>
                </div>

                <div className="w-24 h-8 rounded-lg bg-[#E5B35C] text-[#1A1206] flex items-center justify-between font-bold text-xs shrink-0">
                  <button
                    onClick={() => updateCartQty(c.id, -1)}
                    className="w-8 h-8 text-base text-center"
                  >
                    −
                  </button>
                  <span>{c.qty}</span>
                  <button
                    onClick={() => updateCartQty(c.id, 1)}
                    className="w-8 h-8 text-base text-center"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center py-2">
            <button
              onClick={() => setIsParcel(!isParcel)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#C7BFB2]"
            >
              <span
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  isParcel ? 'bg-[#34B866]' : 'bg-[#3A352E]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isParcel ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
              <span>Parcel (+₹10)</span>
            </button>

            {showNameInput ? (
              <input
                type="text"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-[#26231F] border border-[#3A352E] text-xs text-white outline-none w-28"
              />
            ) : (
              <button
                onClick={() => setShowNameInput(true)}
                className="min-h-[32px] px-3 rounded-full border border-[#3A352E] text-xs font-semibold"
              >
                + Name
              </button>
            )}

            <button
              onClick={() => setShowDiscountSheet(true)}
              className="min-h-[32px] px-3 rounded-full border border-[#3A352E] text-xs font-semibold"
            >
              {safeDiscount > 0 ? `−₹${safeDiscount}` : 'Discount'}
            </button>

            {cart.length > 0 && (
              <button onClick={clearPOS} className="text-xs text-red-400 underline ml-auto">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#3A352E]">
          <button
            disabled={cart.length === 0}
            onClick={() => setStep('cash')}
            className="h-16 rounded-xl bg-[#E5B35C] text-[#1A1206] font-extrabold text-lg flex items-center justify-center tabular-nums active:scale-95 transition-transform disabled:opacity-40"
          >
            Cash ₹{finalTotal}
          </button>

          <button
            disabled={cart.length === 0}
            onClick={() => setStep('upi')}
            className="h-16 rounded-xl bg-[#E5B35C] text-[#1A1206] font-extrabold text-lg flex items-center justify-center tabular-nums active:scale-95 transition-transform disabled:opacity-40"
          >
            UPI ₹{finalTotal}
          </button>
        </div>
      </div>

      {/* Discount Bottom Sheet Modal */}
      {showDiscountSheet && (
        <div
          onClick={() => setShowDiscountSheet(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1C1A18] rounded-t-2xl sm:rounded-2xl border border-[#3A352E] p-5 shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Discount</h3>
              <button
                type="button"
                onClick={() => setShowDiscountSheet(false)}
                className="w-7 h-7 rounded-full bg-[#26231F] text-[#9A9184] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[0, 5, 10, 20].map((disc) => (
                <button
                  key={disc}
                  onClick={() => {
                    setDiscountAmount(disc);
                    setShowDiscountSheet(false);
                  }}
                  className={`min-h-[52px] rounded-xl border text-sm font-bold tabular-nums ${
                    discountAmount === disc
                      ? 'border-[#E5B35C] bg-[#E5B35C]/20 text-[#E5B35C]'
                      : 'border-[#3A352E] bg-[#26231F] text-white'
                  }`}
                >
                  {disc === 0 ? 'No discount' : `−₹${disc}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}