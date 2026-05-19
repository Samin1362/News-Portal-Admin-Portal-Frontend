"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils/cn";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAdminAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once signed in, route based on role so non-admins don't loop through login.
  useEffect(() => {
    if (auth.loading || !auth.firebaseUser) return;
    if (auth.role === "admin") router.replace("/");
    else if (auth.role) router.replace("/access-denied");
  }, [auth.loading, auth.firebaseUser, auth.role, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await auth.signIn(email.trim(), password);
      // useEffect above handles the redirect once the profile syncs.
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-paper border-[1.5px] border-ink rounded-sm p-6 shadow-[6px_6px_0_var(--color-ink)]">
      <header className="mb-5">
        <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
          Deligo Admin
        </p>
        <h1 className="serif text-[28px] font-extrabold tracking-tight mt-1">
          Sign in
        </h1>
        <p className="mt-1 font-hand text-[12px] text-muted">
          Admin role required. Other roles will be redirected.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="font-sans text-[12px] font-semibold">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className={cn(
              "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
              "font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30",
            )}
          />
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className={cn(
              "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
              "font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30",
            )}
          />
        </label>

        {error ? (
          <p className="font-hand text-[12px] text-accent">{error}</p>
        ) : null}

        <Btn
          type="submit"
          variant="primary"
          size="md"
          disabled={submitting || !email || !password}
          className="w-full"
        >
          <LogIn size={14} aria-hidden />
          {submitting ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </section>
  );
}
