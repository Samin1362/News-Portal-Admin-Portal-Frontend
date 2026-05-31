"use client";

import { useState } from "react";
import { Copy, Check, KeyRound, Mail } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { Card, CardHead, CardMeta, CardTitle } from "@/components/primitives/Card";
import { SectionTitle } from "@/components/primitives/SectionTitle";
import { useToast } from "@/lib/ui/toast";

const CONTACT_EMAIL = "platform@deligo.news";

export default function ApiKeysPage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success("Address copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't access clipboard.");
    }
  }

  return (
    <>
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <SectionTitle>API &amp; Webhooks</SectionTitle>
        <span className="font-hand text-[12px] text-muted">
          Reserved — no tokens issued today
        </span>
      </header>

      <Card>
        <CardHead>
          <CardTitle>No API tokens yet</CardTitle>
          <CardMeta>Backend gap</CardMeta>
        </CardHead>
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-10 h-10 border-[1.5px] border-ink rounded-sm bg-paper-2"
          >
            <KeyRound size={18} aria-hidden />
          </span>
          <div className="flex-1 min-w-0 space-y-3">
            <p className="font-sans text-[14px] text-ink/85 leading-relaxed max-w-[60ch]">
              The Deligo backend doesn&rsquo;t expose programmatic tokens or
              webhook endpoints today. Every admin action goes through your
              Firebase session — there&rsquo;s nothing to rotate, revoke, or
              hand to a third-party integration from this page.
            </p>
            <p className="font-sans text-[14px] text-ink/85 leading-relaxed max-w-[60ch]">
              When the platform ships token issuance, this surface will list
              your active tokens, scopes, last-used timestamps, and webhook
              targets. Until then, contact a platform admin for one-off
              integration help.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border-[1.5px] border-ink rounded-md bg-paper hover:bg-paper-2 font-sans text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <Mail size={14} aria-hidden />
                {CONTACT_EMAIL}
              </a>
              <Btn
                type="button"
                variant="default"
                size="md"
                onClick={handleCopyEmail}
                aria-label="Copy contact email"
              >
                {copied ? (
                  <>
                    <Check size={14} aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden />
                    Copy address
                  </>
                )}
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>What this will look like</CardTitle>
          <CardMeta>Preview</CardMeta>
        </CardHead>
        <ul className="space-y-2 font-sans text-[13px] text-ink/85">
          {[
            "Issue a new token with a name, scopes (read / write per resource), and an optional expiry.",
            "Inspect last-used timestamp and originating IP for every token.",
            "Revoke or rotate without losing the audit trail.",
            "Register webhook URLs that receive article-publish, comment-reported, and role-change events.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-ink/40 shrink-0"
              />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-hand text-[11px] text-muted">
          Tracked in <code className="font-mono">admin_portal_plan.md</code>
          {" "}— Phase 9, item 2.
        </p>
      </Card>
    </>
  );
}
