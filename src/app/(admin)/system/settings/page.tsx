"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Save, UploadCloud, X } from "lucide-react";
import { Avatar } from "@/components/primitives/Avatar";
import { Btn } from "@/components/primitives/Btn";
import { Card, CardHead, CardMeta, CardTitle } from "@/components/primitives/Card";
import { Input } from "@/components/primitives/Input";
import { SectionTitle } from "@/components/primitives/SectionTitle";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import { updateMe } from "@/lib/api/users.api";
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import {
  DEFAULT_PREFS,
  usePortalPrefs,
  writePortalPrefs,
  type Density,
} from "@/hooks/usePortalPrefs";
import {
  CloudinaryUploadError,
  uploadToCloudinary,
} from "@/lib/cloudinary/upload";
import { cn } from "@/lib/utils/cn";

const LANDING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "/", label: "Overview" },
  { value: "/content/articles/queue", label: "Editorial queue" },
  { value: "/moderation/comments", label: "Comment moderation" },
  { value: "/people/users", label: "Users" },
  { value: "/insights/analytics", label: "Analytics" },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string; hint: string }> = [
  { value: "compact", label: "Compact", hint: "10px gutters" },
  { value: "cozy", label: "Cozy", hint: "14px gutters · default" },
  { value: "comfy", label: "Comfy", hint: "18px gutters" },
];

export default function SettingsPage() {
  const { profile, getIdToken, signOut, refreshProfile } = useAdminAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const recordAudit = useAuditRecorder();
  const prefs = usePortalPrefs();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL ?? "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Render-phase compare-and-set: if the server profile finishes loading
  // after this page mounted, seed the form fields exactly once.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (profile && seededFor !== profile.id) {
    setSeededFor(profile.id);
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setPhotoURL(profile.photoURL ?? "");
  }

  const saveM = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const trimmedName = displayName.trim();
      if (trimmedName.length < 1) {
        throw new Error("Display name is required.");
      }
      return updateMe(
        {
          displayName: trimmedName,
          bio: bio.trim(),
          photoURL: photoURL || null,
        },
        token,
      );
    },
    onSuccess: async (next) => {
      toast.success("Profile updated.");
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["user", next.id] });
      recordAudit({
        action: "user-self-update",
        targetId: next.id,
        summary: `Updated own profile`,
        detail: next.email,
      });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Save failed.";
      toast.error(message);
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saveM.isPending) return;
    saveM.mutate();
  }

  async function handlePhotoFile(file: File) {
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const asset = await uploadToCloudinary(file);
      setPhotoURL(asset.url);
    } catch (err) {
      const message =
        err instanceof CloudinaryUploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed.";
      setPhotoError(message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch {
      // signOut errors are surfaced via the auth provider's own toasting.
    }
  }

  if (!profile) {
    return (
      <Card>
        <p className="font-hand text-[12px] text-muted">Loading profile…</p>
      </Card>
    );
  }

  const dirty =
    displayName.trim() !== profile.displayName ||
    bio.trim() !== (profile.bio ?? "") ||
    (photoURL || "") !== (profile.photoURL ?? "");

  return (
    <>
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <SectionTitle>Settings</SectionTitle>
        <span className="font-hand text-[12px] text-muted">
          Your profile + portal preferences
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Card>
          <CardHead>
            <CardTitle>Profile</CardTitle>
            <CardMeta>PATCH /users/me</CardMeta>
          </CardHead>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-start gap-4">
              <Avatar
                name={displayName || profile.displayName}
                src={photoURL || null}
                size="lg"
                tone="ink"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <label
                  htmlFor="settings-photo"
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 border-[1.5px] border-ink rounded-md",
                    "font-sans text-[12px] font-semibold cursor-pointer",
                    "hover:bg-paper-2 focus-within:ring-2 focus-within:ring-accent/30",
                    photoUploading && "opacity-50 cursor-wait",
                  )}
                >
                  <UploadCloud size={14} aria-hidden />
                  {photoUploading ? "Uploading…" : "Replace photo"}
                  <input
                    id="settings-photo"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={photoUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handlePhotoFile(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {photoURL ? (
                  <button
                    type="button"
                    onClick={() => setPhotoURL("")}
                    className="ml-2 inline-flex items-center gap-1 font-hand text-[11px] text-muted hover:text-accent"
                  >
                    <X size={12} aria-hidden />
                    Remove
                  </button>
                ) : null}
                {photoError ? (
                  <p className="font-hand text-[11px] text-accent">
                    {photoError}
                  </p>
                ) : null}
                <p className="font-hand text-[11px] text-muted">
                  PNG or JPG. Stored in Cloudinary; the URL is saved to
                  your profile.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="font-sans text-[12px] font-semibold">
                Display name
              </span>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={120}
                required
              />
            </label>

            <label className="block">
              <span className="font-sans text-[12px] font-semibold">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className={cn(
                  "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
                  "font-sans text-[14px] placeholder:text-muted resize-y",
                  "focus:outline-none focus:ring-2 focus:ring-accent/30",
                )}
                placeholder="A short blurb shown on your public profile."
              />
              <span className="font-hand text-[11px] text-muted block text-right mt-1">
                {bio.length} / 500
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Btn
                type="submit"
                variant="primary"
                size="md"
                disabled={!dirty || saveM.isPending || photoUploading}
              >
                <Save size={14} aria-hidden />
                {saveM.isPending ? "Saving…" : "Save profile"}
              </Btn>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHead>
              <CardTitle>Portal preferences</CardTitle>
              <CardMeta>This device only</CardMeta>
            </CardHead>

            <fieldset className="space-y-2">
              <legend className="font-sans text-[12px] font-semibold">
                Density
              </legend>
              <div
                role="radiogroup"
                aria-label="Density"
                className="grid grid-cols-3 gap-2"
              >
                {DENSITY_OPTIONS.map((opt) => {
                  const active = prefs.density === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => writePortalPrefs({ density: opt.value })}
                      className={cn(
                        "border-[1.5px] rounded-sm p-2 text-left transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/40 bg-paper hover:bg-paper-2",
                      )}
                    >
                      <span className="block font-sans text-[12px] font-semibold">
                        {opt.label}
                      </span>
                      <span
                        className={cn(
                          "block font-hand text-[10px] mt-0.5",
                          active ? "text-paper/80" : "text-muted",
                        )}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block mt-4">
              <span className="font-sans text-[12px] font-semibold">
                Default landing after sign-in
              </span>
              <select
                value={prefs.defaultLanding}
                onChange={(e) =>
                  writePortalPrefs({ defaultLanding: e.target.value })
                }
                className={cn(
                  "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
                  "font-sans text-[14px]",
                  "focus:outline-none focus:ring-2 focus:ring-accent/30",
                )}
              >
                {LANDING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between mt-4 gap-3">
              <div>
                <p className="font-sans text-[12px] font-semibold">
                  Show top ticker
                </p>
                <p className="font-hand text-[11px] text-muted">
                  Live counts strip below the topbar.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.showTicker}
                aria-label="Toggle ticker"
                onClick={() =>
                  writePortalPrefs({ showTicker: !prefs.showTicker })
                }
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full border-[1.5px] border-ink transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                  prefs.showTicker ? "bg-accent" : "bg-paper",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-paper border border-ink transition-transform",
                    prefs.showTicker ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => writePortalPrefs(DEFAULT_PREFS)}
              className="mt-4 font-hand text-[11px] text-muted hover:text-accent"
            >
              Reset to defaults
            </button>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Session</CardTitle>
              <CardMeta>{profile.email}</CardMeta>
            </CardHead>
            <p className="font-hand text-[12px] text-muted">
              You&rsquo;re signed in as <span className="font-semibold text-ink">{profile.role}</span>.
              Signing out clears your Firebase session on this device.
            </p>
            <Btn
              type="button"
              variant="primary"
              size="md"
              onClick={handleSignOut}
              className="mt-3"
            >
              <LogOut size={14} aria-hidden />
              Sign out
            </Btn>
          </Card>
        </div>
      </div>
    </>
  );
}
