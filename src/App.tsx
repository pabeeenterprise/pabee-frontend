import { useState, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './components/CustomerMenu';

// Lazy-load heavy routes so QR diners only download the menu on initial load
const Checkout = lazy(() => import('./components/Checkout'));
const QRScanner = lazy(() => import('./components/QRScanner'));
const VendorPortal = lazy(() => import('./components/VendorPortal'));

function getInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === 'true';
  const scannedVendor = params.get('vendor');
  const scannedTable = params.get('table');

  return {
    isAdmin,
    vendorId: scannedVendor || 'spice-street-kitchen',
    tableId: scannedTable || 'Table-Unknown',
    initialView: isAdmin
      ? ('dashboard' as const)
      : scannedVendor
      ? ('menu' as const)
      : ('scanner' as const),
  };
}

function App() {
  const [initial] = useState(getInitialRoute);
  const [currentView, setCurrentView] = useState<'scanner' | 'menu' | 'checkout' | 'dashboard'>(
    initial.initialView
  );
  const [vendorId, setVendorId] = useState(initial.vendorId);
  const [tableId, setTableId] = useState(initial.tableId);
  const isAdminMode = initial.isAdmin;

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

  if (isAdminMode) {
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