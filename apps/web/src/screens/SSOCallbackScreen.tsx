import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { FullPageLoader } from "@/components/FullPageLoader";

export function SSOCallbackScreen() {
  return (
    <>
      <FullPageLoader text="Signing in" />
      <div className="absolute">
        <AuthenticateWithRedirectCallback />
      </div>
    </>
  );
}
