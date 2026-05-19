"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";

/**
 * Guards the (admin) route group. Unauthenticated → /login. Authenticated
 * but non-admin → /access-denied. Returns the auth state plus a boolean
 * `isAdmin` so consumers can render a loading shell while resolution is
 * in flight.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const auth = useAdminAuth();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.firebaseUser) {
      router.replace("/login");
      return;
    }
    if (auth.profile?.isBlocked) {
      void auth.signOut();
      router.replace("/login");
      return;
    }
    if (auth.role && auth.role !== "admin") {
      router.replace("/access-denied");
    }
  }, [auth, router]);

  const isAdmin = !auth.loading && auth.role === "admin";
  return { ...auth, isAdmin };
}
