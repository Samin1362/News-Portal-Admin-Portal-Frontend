"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";

export default function AccessDeniedPage() {
  const router = useRouter();
  const { profile, signOut } = useAdminAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-[480px] bg-paper border-[1.5px] border-ink rounded-sm p-6 shadow-[6px_6px_0_var(--color-ink)]">
        <p className="font-hand text-[12px] uppercase tracking-wider text-accent">
          Access denied
        </p>
        <h1 className="serif text-[28px] font-extrabold tracking-tight mt-1">
          The admin portal is admin-only.
        </h1>
        <p className="mt-3 font-sans text-[14px] text-ink/80 leading-relaxed">
          {profile
            ? `You're signed in as ${profile.displayName} (${profile.role}).` +
              " Sign out and back in with an admin account, or open a different Deligo product."
            : "Sign in with an admin account to continue."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Btn
            type="button"
            variant="primary"
            size="md"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            <LogOut size={14} aria-hidden />
            Sign out & switch account
          </Btn>
        </div>
      </section>
    </div>
  );
}
