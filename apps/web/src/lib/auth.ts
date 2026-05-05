import { useSignIn } from "@clerk/react";
import { useState } from "react";

export function useGithubLogin() {
  const { signIn } = useSignIn();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = () => {
    if (!signIn) return;
    setIsLoggingIn(true);
    signIn
      .sso({
        strategy: "oauth_github",
        redirectUrl: "/feed",
        redirectCallbackUrl: "/sso-callback",
      })
      .catch(() => setIsLoggingIn(false));
  };

  return { login, isLoggingIn };
}
