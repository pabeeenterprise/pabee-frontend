import { useState, useEffect } from 'react';
import { useAuth, UserButton } from '@clerk/clerk-react';
import LiveOrders from './LiveOrders';
import Overview from './Overview';
import MenuEditor from './MenuEditor';
import Analytics from './Analytics';
import OffersPromos from './OffersPromos';
import MyQRCode from './MyQRCode';
import Settings from './Settings';
import BrandingStudio from './BrandingStudio';
import PaymentSettings from './PaymentSettings';
import CounterPOS from './CounterPOS';
import {
  unlockAudio,
  getSavedSoundPreset,
  saveSoundPreset,
  playOrderAlert,
  SOUND_OPTIONS,
  SoundPreset,
  SoundOption,
} from '../utils/soundAlerts';

export default function VendorDashboard({ vendorId: defaultVendorId }: { vendorId: string }) {
  const { userId, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'counter' | 'menu' | 'money' | 'more'>('orders');
  const [moreSubTab, setMoreSubTab] = useState<string | null>(null);
  const [realVendorId, setRealVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('Your Stall');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState<SoundPreset>(() => getSavedSoundPreset());

  useEffect(() => {
    if (userId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${userId}/profile`)
        .then((res) => {
          if (!res.ok) throw new Error('Profile not found');
          return res.json();
        })
        .then((data) => {
          setRealVendorId(data.id);
          if (data.name) setVendorName(data.name);
        })
        .catch((err) => {
          console.error('Database sync error:', err);
          setRealVendorId(defaultVendorId);
        });
    }
  }, [userId, defaultVendorId]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const handleSelectSound = (id: SoundPreset) => {
    unlockAudio();
    setSelectedSound(id);
    saveSoundPreset(id);
    playOrderAlert(id);
  };
  
  const activeSoundLabel =
    SOUND_OPTIONS.find((s) => s.id === selectedSound)?.label || 'Classic Service Bell';

  if (!isLoaded || !realVendorId || !userId) {
    return (
      <div className="min-h-screen bg-[#121110] flex items-center justify-center text-[#E5B35C] font-semibold text-lg">
        Loading terminal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121110] text-[#F5F0E8] font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* 1. DESKTOP / TABLET SLIM ICON RAIL (`.vrail`) */}
      <nav aria-label="Sections" className="hidden md:flex flex-col w-20 lg:w-48 border-r border-[#3A352E] bg-[#121110] p-3 gap-2 shrink-0">
        <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-[#3A352E]/60">
          <div className="w-10 h-10 rounded-xl bg-[#E5B35C] text-[#1A1206] font-extrabold text-xl grid place-items-center shrink-0">
            {vendorName[0]?.toUpperCase()}
          </div>
          <div className="hidden lg:block truncate">
            <div className="font-bold text-sm truncate">{vendorName}</div>
            <div className="text-[11px] text-[#5CC97B] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5CC97B]" /> Live
            </div>
          </div>
        </div>

        <button
          onClick={() => { setActiveTab('orders'); setMoreSubTab(null); }}
          className={`h-12 lg:h-11 rounded-xl flex items-center justify-center lg:justify-start lg:px-3 gap-3 text-sm font-semibold transition-colors ${
            activeTab === 'orders' ? 'bg-[#26231F] text-[#F5F0E8]' : 'text-[#9A9184] hover:text-[#F5F0E8]'
          }`}
        >
          <span className="text-lg">📋</span>
          <span className="hidden lg:inline">Orders</span>
        </button>

        <button
          onClick={() => { setActiveTab('counter'); setMoreSubTab(null); }}
          className={`h-12 lg:h-11 rounded-xl flex items-center justify-center lg:justify-start lg:px-3 gap-3 text-sm font-semibold transition-colors ${
            activeTab === 'counter' ? 'bg-[#26231F] text-[#F5F0E8]' : 'text-[#9A9184] hover:text-[#F5F0E8]'
          }`}
        >
          <span className="text-lg">⚡</span>
          <span className="hidden lg:inline">Counter POS</span>
        </button>

        <button
          onClick={() => { setActiveTab('menu'); setMoreSubTab(null); }}
          className={`h-12 lg:h-11 rounded-xl flex items-center justify-center lg:justify-start lg:px-3 gap-3 text-sm font-semibold transition-colors ${
            activeTab === 'menu' ? 'bg-[#26231F] text-[#F5F0E8]' : 'text-[#9A9184] hover:text-[#F5F0E8]'
          }`}
        >
          <span className="text-lg">🍳</span>
          <span className="hidden lg:inline">Menu & Stock</span>
        </button>

        <button
          onClick={() => { setActiveTab('money'); setMoreSubTab(null); }}
          className={`h-12 lg:h-11 rounded-xl flex items-center justify-center lg:justify-start lg:px-3 gap-3 text-sm font-semibold transition-colors ${
            activeTab === 'money' ? 'bg-[#26231F] text-[#F5F0E8]' : 'text-[#9A9184] hover:text-[#F5F0E8]'
          }`}
        >
          <span className="text-lg">💰</span>
          <span className="hidden lg:inline">Galla / Cash</span>
        </button>

        <button
          onClick={() => { setActiveTab('more'); setMoreSubTab(null); }}
          className={`h-12 lg:h-11 rounded-xl flex items-center justify-center lg:justify-start lg:px-3 gap-3 text-sm font-semibold transition-colors ${
            activeTab === 'more' ? 'bg-[#26231F] text-[#F5F0E8]' : 'text-[#9A9184] hover:text-[#F5F0E8]'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="hidden lg:inline">More</span>
        </button>

        <div className="mt-auto pt-3 border-t border-[#3A352E]/60 flex items-center justify-center lg:justify-start lg:px-2 gap-2">
          <UserButton />
          <span className="hidden lg:inline text-xs text-[#9A9184]">Account</span>
        </div>
      </nav>

      {/* 2. MAIN ACTIVE VIEWPORT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Header with Bell Trigger */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#3A352E] bg-[#121110] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E5B35C] text-[#1A1206] font-extrabold text-base grid place-items-center shrink-0">
              {vendorName[0]?.toUpperCase()}
            </div>
            <div className="truncate">
              <span className="font-bold text-sm block truncate">{vendorName}</span>
              <span className="text-[10px] text-[#5CC97B] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5CC97B]" /> Shop Open
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
          <button
  onClick={() => {
    unlockAudio();
    setSoundEnabled((prev) => !prev);
  }}
  className={`w-9 h-9 rounded-lg border text-sm flex items-center justify-center ${
    soundEnabled ? 'border-[#3A352E] text-[#F5F0E8]' : 'border-red-500/40 text-red-400 bg-red-500/10'
  }`}
  aria-label="Toggle notification sounds"
>
  {soundEnabled ? '🔔' : '🔕'}
</button>
            <UserButton />
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0">
          {activeTab === 'orders' && (
            <LiveOrders vendorId={realVendorId} mode="queue" soundEnabled={soundEnabled} />
          )}

          {activeTab === 'counter' && (
            <CounterPOS vendorId={realVendorId} />
          )}

          {activeTab === 'menu' && (
            <div className="p-4 max-w-5xl mx-auto">
              <MenuEditor vendorId={realVendorId} />
            </div>
          )}

          {activeTab === 'money' && (
            <div className="p-4 max-w-5xl mx-auto">
              <Overview vendorId={realVendorId} />
            </div>
          )}

          {/* TAB 5: MORE OPTIONS */}
          {activeTab === 'more' && (
            <div className="max-w-xl mx-auto p-4 space-y-4 font-sans text-[#F5F0E8]">
              {moreSubTab ? (
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#3A352E]">
                    <button
                      onClick={() => setMoreSubTab(null)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-[#E5B35C] active:scale-90 transition-transform"
                      aria-label="Back to More Menu"
                    >
                      ←
                    </button>
                    <h1 className="text-xl font-bold capitalize">
  {moreSubTab === 'sounds' ? 'Order Sound Alerts' : moreSubTab.replace('-', ' ')}
</h1>
                  </div>

                  {moreSubTab === 'analytics' && <Analytics vendorId={realVendorId} />}
                  {moreSubTab === 'offers' && <OffersPromos vendorId={realVendorId} />}
                  {moreSubTab === 'branding' && <BrandingStudio vendorId={userId} />}
                  {moreSubTab === 'payment-settings' && <PaymentSettings vendorId={realVendorId} />}
                  {moreSubTab === 'qr-code' && <MyQRCode vendorId={userId} />}
                  {moreSubTab === 'settings' && <Settings vendorId={userId} />}
                  {moreSubTab === 'sounds' && (
  <div className="space-y-4">
    <div className="p-4 rounded-2xl bg-[#1C1A18] border border-[#3A352E] flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-white">Audio Notifications</div>
        <div className="text-xs text-[#9A9184] mt-0.5">
          {soundEnabled ? 'Alerts ring automatically on new orders' : 'Terminal alerts are muted'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSoundEnabled((prev) => !prev)}
        aria-pressed={soundEnabled}
        className="flex items-center min-h-[44px]"
      >
        <span
          className={`w-11 h-6 rounded-full relative transition-colors ${
            soundEnabled ? 'bg-[#5CC97B]' : 'bg-[#3A352E]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              soundEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>

    <div
      className={`bg-[#1C1A18] border border-[#3A352E] rounded-2xl divide-y divide-[#3A352E] overflow-hidden ${
        !soundEnabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {SOUND_OPTIONS.filter((opt) => opt.id !== 'audio_file').map((opt: SoundOption) => {
        const isCurrent = selectedSound === opt.id;
        return (
          <div
            key={opt.id}
            onClick={() => handleSelectSound(opt.id)}
            className={`px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
              isCurrent ? 'bg-[#26231F]' : 'hover:bg-[#26231F]/50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <span className="text-xl shrink-0">{opt.icon}</span>
              <div className="truncate">
                <div className="text-sm font-semibold text-white truncate">{opt.label}</div>
                <div className="text-xs text-[#9A9184] truncate mt-0.5">{opt.desc}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectSound(opt.id);
                }}
                className="min-h-[32px] px-3 rounded-full border border-[#3A352E] bg-[#121110] text-xs font-semibold text-[#E5B35C] hover:bg-[#E5B35C] hover:text-[#121110] transition-colors"
              >
                Test
              </button>
              <span className="w-5 text-center text-[#5CC97B] font-bold text-sm">
                {isCurrent ? '✓' : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="px-1">
                    <h2 className="text-xl font-bold">More Options</h2>
                    <p className="text-xs text-[#9A9184] mt-0.5">
                      Stall settings, promotions, branding & alerts
                    </p>
                  </div>

                  <div className="bg-[#1C1A18] border border-[#3A352E] rounded-2xl divide-y divide-[#3A352E] overflow-hidden shadow-sm">

                    {[
                      {
                        id: 'analytics',
                        icon: '📊',
                        title: 'Sales Analytics',
                        desc: 'Revenue trends, top dishes & customer visits',
                      },
                      {
                        id: 'offers',
                        icon: '🎟️',
                        title: 'Offers & Promos',
                        desc: 'Public deal marquee and discount codes',
                      },
                      {
                        id: 'branding',
                        icon: '🎨',
                        title: 'Branding Studio',
                        desc: 'Logo, banner, colors & theme modes',
                      },
                      {
                        id: 'payment-settings',
                        icon: '💳',
                        title: 'Payment Gateway',
                        desc: 'Razorpay API keys and counter UPI ID',
                      },
                      {
                        id: 'qr-code',
                        icon: '📱',
                        title: 'Store QR Standee',
                        desc: 'Download and print table ordering QRs',
                      },
                      {
                        id: 'settings',
                        icon: '🏪',
                        title: 'Stall Details',
                        desc: 'Store name, address and master PIN',
                      },
                      {
                        id: 'sounds',
                        icon: '🔔',
                        title: 'Order Sound Alerts',
                        desc: soundEnabled ? `Tone: ${activeSoundLabel}` : 'Muted',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMoreSubTab(opt.id)}
                        className="w-full min-h-[68px] px-4 py-3 flex items-center justify-between text-left hover:bg-[#26231F] active:bg-[#26231F] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <span className="text-2xl shrink-0">{opt.icon}</span>
                          <div className="truncate">
                            <div className="text-[15px] font-semibold text-white leading-snug truncate">
                              {opt.title}
                            </div>
                            <div className="text-xs text-[#9A9184] truncate mt-0.5">
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        <span className="text-lg text-[#9A9184] font-bold shrink-0">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION */}
        <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121110] border-t border-[#3A352E] flex items-center justify-around z-40">
          <button
            onClick={() => { setActiveTab('orders'); setMoreSubTab(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[11px] font-semibold ${
              activeTab === 'orders' ? 'text-[#E5B35C]' : 'text-[#9A9184]'
            }`}
          >
            <span className="text-lg">📋</span>
            <span>Orders</span>
          </button>

          <button
            onClick={() => { setActiveTab('counter'); setMoreSubTab(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[11px] font-semibold ${
              activeTab === 'counter' ? 'text-[#E5B35C]' : 'text-[#9A9184]'
            }`}
          >
            <span className="text-lg">⚡</span>
            <span>Counter</span>
          </button>

          <button
            onClick={() => { setActiveTab('menu'); setMoreSubTab(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[11px] font-semibold ${
              activeTab === 'menu' ? 'text-[#E5B35C]' : 'text-[#9A9184]'
            }`}
          >
            <span className="text-lg">🍳</span>
            <span>Menu</span>
          </button>

          <button
            onClick={() => { setActiveTab('money'); setMoreSubTab(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[11px] font-semibold ${
              activeTab === 'money' ? 'text-[#E5B35C]' : 'text-[#9A9184]'
            }`}
          >
            <span className="text-lg">💰</span>
            <span>Money</span>
          </button>

          <button
            onClick={() => { setActiveTab('more'); setMoreSubTab(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[11px] font-semibold ${
              activeTab === 'more' ? 'text-[#E5B35C]' : 'text-[#9A9184]'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}