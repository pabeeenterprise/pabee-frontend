import { ClerkProvider, Show, SignIn } from "@clerk/react";
import VendorDashboard from './VendorDashboard';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
}

export default function VendorPortal({ vendorId }: { vendorId: string }) {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <div className="min-h-screen bg-[#121110]">
        <Show when="signed-out">
          <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
            <SignIn
              routing="hash"
              fallbackRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
            />
          </div>
        </Show>

        <Show when="signed-in">
          <VendorDashboard vendorId={vendorId} />
        </Show>
      </div>
    </ClerkProvider>
  );
}