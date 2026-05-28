import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (vendorId: string, tableId: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  useEffect(() => {
    // Initialize the camera scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText: string) => { // 👈 FIXED: Told TypeScript this is a string
        // Stop scanning once we get a result
        scanner.clear();
        
        try {
          let scannedVendor = "";
          let scannedTable = "";

          // Handle if it's a full Vercel URL
          if (decodedText.includes('http')) {
            const url = new URL(decodedText);
            scannedVendor = url.searchParams.get('vendor') || "";
            scannedTable = url.searchParams.get('table') || "";
          } else {
            // Handle if it's just raw text
            const parts = decodedText.split(',');
            scannedVendor = parts[0];
            scannedTable = parts[1];
          }
          
          if (scannedVendor && scannedTable) {
            onScanSuccess(scannedVendor, scannedTable);
          } else {
            alert("Invalid Pabee QR Code! Please try again.");
          }
        } catch (e) {
          alert("Invalid QR format.");
        }
      },
      () => { // 👈 FIXED: Removed 'errorMessage' entirely so TS stops complaining
        // We ignore errors here because the camera throws a silent error 
        // every single frame it doesn't see a QR code!
      }
    );

    // Cleanup camera when component unmounts
    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScanSuccess]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-[#E55B3C] mb-2">pabee</h1>
        <h2 className="text-xl font-bold">Scan Table QR</h2>
        <p className="text-sm text-gray-500 mt-2">Point your camera at the table to order.</p>
      </div>

      {/* The Camera Feed Window */}
      <div className="bg-[#1A1A1A] p-2 rounded-3xl border border-gray-800 w-full max-w-sm overflow-hidden shadow-2xl">
        <div id="reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[300px]"></div>
      </div>

      {/* DEV BUTTON */}
      <button 
        onClick={() => onScanSuccess('spice-street-kitchen', 'Table-7')}
        className="mt-12 px-4 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700 transition-colors"
      >
        [Dev Mode: Simulate scanning "Table 7"]
      </button>

    </div>
  );
}