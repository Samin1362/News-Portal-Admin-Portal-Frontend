"use client";

import Image from "next/image";
import {
  AD_PLACEMENT_DIMENSIONS,
  AD_PLACEMENT_LABEL,
  type AdPlacement,
} from "@/lib/types/ad";
import { cn } from "@/lib/utils/cn";

interface Props {
  placement: AdPlacement;
  imageUrl?: string;
  altText?: string;
  /** Optional name overlay shown on hover so admins see what readers wouldn't. */
  name?: string;
}

/**
 * Renders the ad inside a wrapper sized to the *target* placement. Width is
 * always capped at 100% of the parent so the preview shrinks on narrow viewports
 * but the aspect ratio is preserved from the placement dimensions.
 *
 * Matches `frontend/src/components/public/SidebarAd.tsx` (sidebar = 6:5 aspect,
 * leaderboard ads use the IAB 728×90 ratio).
 */
export function AdPreviewCard({ placement, imageUrl, altText, name }: Props) {
  const dims = AD_PLACEMENT_DIMENSIONS[placement];
  const aspectRatio = `${dims.width} / ${dims.height}`;

  return (
    <div className="space-y-2">
      <header className="flex items-center justify-between gap-2">
        <span className="font-hand text-[11px] uppercase tracking-wider text-muted">
          {AD_PLACEMENT_LABEL[placement]}
        </span>
        <span className="font-hand text-[11px] text-muted">{dims.label}</span>
      </header>
      <div
        className={cn(
          "relative w-full mx-auto overflow-hidden border-[1.5px] border-ink rounded-sm bg-paper-2",
          "max-w-full",
        )}
        style={{
          aspectRatio,
          maxWidth: `min(100%, ${dims.width}px)`,
        }}
        role="img"
        aria-label={altText || name || "Ad preview"}
      >
        {imageUrl ? (
          // Cloudinary URL — already configured in next.config.ts remotePatterns.
          <Image
            src={imageUrl}
            alt={altText || ""}
            fill
            sizes={`(max-width: 768px) 100vw, ${dims.width}px`}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <p className="font-hand text-[12px] text-muted text-center px-4">
              Upload an image to preview
              <br />
              <span className="text-[10px]">
                Recommended {dims.label}
              </span>
            </p>
          </div>
        )}
        {name ? (
          <span className="absolute bottom-1 left-1 bg-ink/85 text-paper px-2 py-0.5 font-hand text-[10px] uppercase tracking-wider rounded-sm">
            {name}
          </span>
        ) : null}
      </div>
    </div>
  );
}
