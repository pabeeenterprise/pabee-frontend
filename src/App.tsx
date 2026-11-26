import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';

// Lazy-load heavy routes so QR diners only download the menu on initial load
const Checkout = lazy(() => import('./components/Checkout'));
const QRScanner = lazy(() => import('./components/QRScanner'));
const VendorPortal = lazy(() => import('./components/VendorPortal'));

function getInitialRoute() {
  const pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const scannedVendor = params.get('vendor');
  const scannedTable = params.get('table');
  const hadLegacyAdminParam = params.has('admin');

  // 1. Table QR scan (?vendor=<UUID>&table=Table-1) -> Customer Menu
  if (scannedVendor) {
    return {
      isVendorPortal: false,
      hadLegacyAdminParam: false,
      vendorId: scannedVendor,
      tableId: scannedTable || 'Table-Unknown',
      initialView: 'menu' as const,
    };
  }

  // 2. Explicit /scan path -> In-browser QR Scanner
  if (pathname === '/scan') {
    return {
      isVendorPortal: false,
      hadLegacyAdminParam: false,
      vendorId: 'spice-street-kitchen',
      tableId: 'Table-Unknown',
      initialView: 'scanner' as const,
    };
  }

  // 3. Root domain (orderustaad.com) and /dashboard or /pos -> Vendor Portal
  return {
    isVendorPortal: true,
    hadLegacyAdminParam,
    vendorId: 'spice-street-kitchen',
    tableId: 'Table-Unknown',
    initialView: 'dashboard' as const,
  };
}

function App() {
  const [initial] = useState(getInitialRoute);
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard'>(
    initial.initialView
  );
  const [vendorId, setVendorId] = useState(initial.vendorId);
  const [tableId, setTableId] = useState(initial.tableId);

  // Clean up old ?admin=true bookmarks so the address bar stays clean
  useEffect(() => {
    if (initial.hadLegacyAdminParam) {
      window.history.replaceState({}, '', '/');
    }
  }, [initial.hadLegacyAdminParam]);

  const handleScanSuccess = (scannedVendor: string, scannedTable: string) => {
    setVendorId(scannedVendor);
    setTableId(scannedTable);
    setCurrentView('menu');
  };

  const fallbackLoader = (
    <div className="min-h-screen bg-[#121110] flex items-center justify-center text-[#E5B35C] font-semibold text-sm">
      Loading…
    </div>
  );

  if (initial.isVendorPortal) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Suspense fallback={fallbackLoader}>
          <VendorPortal vendorId={vendorId} />
        </Suspense>
      </>
    );
  }

  return (
    <CartProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="min-h-screen bg-[#0a0a0a] relative">
        {currentView === 'menu' && (
          <CustomerMenu
            vendorId={vendorId}
            onGoToCheckout={() => setCurrentView('checkout')}
          />
        )}

        <Suspense fallback={fallbackLoader}>
          {currentView === 'scanner' && (
            <QRScanner onScanSuccess={handleScanSuccess} />
          )}

          {currentView === 'checkout' && (
            <Checkout
              vendorId={vendorId}
              tableId={tableId}
              onBack={() => setCurrentView('menu')}
            />
          )}
        </Suspense>
      </div>
    </CartProvider>
  );
}

export default App;