import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import VendorDashboard from './VendorDashboard';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
}

export default function VendorPortal({ vendorId }: { vendorId: string }) {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <div className="min-h-screen bg-[#121110]">
        <SignedOut>
          <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            <SignIn
              routing="virtual"
              fallbackRedirectUrl="/?admin=true"
              signUpFallbackRedirectUrl="/?admin=true"
            />
          </div>
        </SignedOut>

        <SignedIn>
          <VendorDashboard vendorId={vendorId} />
        </SignedIn>
      </div>
    </ClerkProvider>
  );
}