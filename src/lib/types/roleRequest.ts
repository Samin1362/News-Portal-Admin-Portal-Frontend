import type { UserRole } from "@/lib/auth/types";

export type RoleRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface RoleRequestSubmittedInfoDTO {
  fullName: string;
  displayName: string;
  bio: string;
  expertiseTags: string[];
  sampleLinks: string[];
  motivation: string;
  phone: string | null;
  photoPublicId: string | null;
  agreedToGuidelinesAt: string;
  guidelinesVersion: string;
}

export interface RoleRequestDTO {
  id: string;
  userId: string;
  fromRole: UserRole;
  toRole: UserRole;
  status: RoleRequestStatus;
  submittedInfo: RoleRequestSubmittedInfoDTO;
  emailVerifiedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
