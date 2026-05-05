import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function AuthSync() {
  const { isAuthenticated } = useConvexAuth();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const calledRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !calledRef.current) {
      calledRef.current = true;
      getOrCreate().catch(console.error);
    }
    if (!isAuthenticated) {
      calledRef.current = false;
    }
  }, [isAuthenticated, getOrCreate]);

  return null;
}
