"use client";

import Link from "next/link";
import { FileText, RefreshCw, Search, UserPlus } from "lucide-react";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";

export function QuickActions() {
  return (
    <Card hov>
      <CardHead>
        <CardTitle>Quick actions</CardTitle>
        <CardMeta>ops endpoints land later</CardMeta>
      </CardHead>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/people/users">
          <Btn type="button" variant="default" size="sm">
            <UserPlus size={12} aria-hidden />
            Invite user
          </Btn>
        </Link>
        <Link href="/content/articles">
          <Btn type="button" variant="default" size="sm">
            <FileText size={12} aria-hidden />
            Open articles
          </Btn>
        </Link>
        <Btn
          type="button"
          variant="ghost"
          size="sm"
          disabled
          title="requires platform-admin tooling — not exposed by API"
        >
          <RefreshCw size={12} aria-hidden />
          Clear CDN
        </Btn>
        <Btn
          type="button"
          variant="ghost"
          size="sm"
          disabled
          title="requires platform-admin tooling — not exposed by API"
        >
          <Search size={12} aria-hidden />
          Re-index search
        </Btn>
      </div>
    </Card>
  );
}
