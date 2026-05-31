"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { ApiError } from "@/lib/api/client";

interface Props {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}

/**
 * Segment-level error boundary for the admin shell. Surfaces a Retry
 * button (re-renders the segment via `unstable_retry`) plus the request
 * ID when the backend echoed it on `X-Request-Id`. Falls back to
 * `reset` if the harness only provides the legacy API.
 */
export default function AdminSegmentError({
  error,
  unstable_retry,
  reset,
}: Props) {
  useEffect(() => {
    console.error("[admin] segment error", error);
  }, [error]);

  const requestId =
    error instanceof ApiError ? error.requestId : undefined;
  const digest = error.digest;
  const status = error instanceof ApiError ? error.status : null;
  const is5xx = status !== null && status >= 500;
  const headline = is5xx
    ? "The server stumbled."
    : status && status >= 400
      ? "That request was rejected."
      : "Something went wrong.";

  function handleRetry() {
    if (unstable_retry) unstable_retry();
    else if (reset) reset();
    else if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <section className="bg-paper border-[1.5px] border-ink rounded-sm p-5 shadow-[4px_4px_0_var(--color-ink)] max-w-[640px]">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-10 h-10 border-[1.5px] border-accent rounded-sm bg-paper text-accent shrink-0"
        >
          <AlertTriangle size={18} aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-hand text-[11px] uppercase tracking-wider text-muted">
            {status ? `Error · ${status}` : "Error"}
          </p>
          <h1 className="serif text-[20px] font-extrabold tracking-tight mt-0.5">
            {headline}
          </h1>
        </div>
      </header>

      <p className="mt-3 font-sans text-[14px] text-ink/85 leading-relaxed">
        {error.message || "An unexpected error interrupted this page."}
      </p>

      {requestId || digest ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          {requestId ? (
            <>
              <dt className="font-hand text-[11px] uppercase tracking-wider">
                Request
              </dt>
              <dd className="font-mono break-all text-ink/85">{requestId}</dd>
            </>
          ) : null}
          {digest ? (
            <>
              <dt className="font-hand text-[11px] uppercase tracking-wider">
                Digest
              </dt>
              <dd className="font-mono break-all text-ink/85">{digest}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Btn type="button" variant="primary" size="md" onClick={handleRetry}>
          <RotateCcw size={14} aria-hidden />
          Try again
        </Btn>
        <Link
          href="/"
          className="font-hand text-[12px] text-muted hover:text-accent"
        >
          Back to overview
        </Link>
      </div>
    </section>
  );
}
