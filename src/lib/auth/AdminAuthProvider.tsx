"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { syncMe } from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import type { UserProfile, UserRole } from "./types";

export interface AdminAuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * Admin-portal auth provider. Drives Firebase auth and syncs the Mongo
 * profile via /auth/sync. Role-gating is enforced separately by
 * `useRequireAdmin` so we can show a clean access-denied surface instead
 * of bouncing users between routes.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedUidRef = useRef<string | null>(null);

  const syncProfileFor = useCallback(async (user: FirebaseUser) => {
    const token = await user.getIdToken();
    try {
      const next = await syncMe(token);
      setProfile(next);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        await fbSignOut(getFirebaseAuth());
        setProfile(null);
        syncedUidRef.current = null;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        syncedUidRef.current = null;
        setLoading(false);
        return;
      }
      if (syncedUidRef.current === user.uid) {
        setLoading(false);
        return;
      }
      try {
        await syncProfileFor(user);
        syncedUidRef.current = user.uid;
      } catch {
        // CONFLICT was already handled; let other failures surface on
        // the next authenticated request.
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [syncProfileFor]);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      const user = getFirebaseAuth().currentUser;
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
    syncedUidRef.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    await syncProfileFor(user);
  }, [syncProfileFor]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      role: profile?.role ?? null,
      loading,
      getIdToken,
      signIn,
      signOut,
      refreshProfile,
    }),
    [firebaseUser, profile, loading, getIdToken, signIn, signOut, refreshProfile],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}
