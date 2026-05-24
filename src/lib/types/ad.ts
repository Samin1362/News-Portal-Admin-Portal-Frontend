/**
 * Mirrors backend AD_PLACEMENTS and DTOs (see backend/src/config/constants.ts
 * and backend/src/views/ad.view.ts). Keep in sync if the contract changes.
 */

export const AD_PLACEMENTS = [
  "home_top",
  "home_sidebar",
  "home_bottom",
  "article_inline",
  "article_sidebar",
  "sponsored_post",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABEL: Record<AdPlacement, string> = {
  home_top: "Home — top",
  home_sidebar: "Home — sidebar",
  home_bottom: "Home — bottom",
  article_inline: "Article — inline",
  article_sidebar: "Article — sidebar",
  sponsored_post: "Sponsored post",
};

/**
 * Slot dimensions admins see in the preview. Matches the public renderer in
 * frontend/src/components/public/*: sidebar = 300×250 (IAB medium rectangle),
 * banners = 728×90 (IAB leaderboard), inline = full-width letterbox.
 */
export const AD_PLACEMENT_DIMENSIONS: Record<
  AdPlacement,
  { width: number; height: number; label: string }
> = {
  home_top: { width: 728, height: 90, label: "728 × 90 leaderboard" },
  home_sidebar: { width: 300, height: 250, label: "300 × 250 sidebar" },
  home_bottom: { width: 728, height: 90, label: "728 × 90 leaderboard" },
  article_inline: { width: 728, height: 90, label: "Full-width inline" },
  article_sidebar: { width: 300, height: 250, label: "300 × 250 sidebar" },
  sponsored_post: { width: 600, height: 400, label: "Sponsored card" },
};

export interface AdminAdDTO {
  id: string;
  name: string;
  placement: AdPlacement;
  imageUrl: string;
  publicId: string;
  linkUrl: string;
  altText: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}
