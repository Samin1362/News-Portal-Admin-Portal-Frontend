"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell/AdminShell";
import { useRequireAdmin } from "@/lib/auth/useRequireAdmin";

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useRequireAdmin();

  if (loading) {
    return <FullShellSkeleton message="Checking your access…" />;
  }
  if (!isAdmin) {
    // useRequireAdmin already triggered router.replace(); show a calm
    // skeleton while the navigation completes instead of flashing the
    // admin shell to a non-admin user.
    return <FullShellSkeleton message="Redirecting…" />;
  }

  return <AdminShell>{children}</AdminShell>;
}

function FullShellSkeleton({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="border-[1.5px] border-ink bg-paper rounded-sm px-5 py-4 shadow-[4px_4px_0_var(--color-ink)]">
        <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
          Deligo Admin
        </p>
        <p className="serif text-[18px] font-extrabold tracking-tight mt-1">
          {message}
        </p>
      </div>
    </div>
  );
}
