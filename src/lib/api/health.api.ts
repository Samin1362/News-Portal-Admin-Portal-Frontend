import { apiFetch } from "./client";

export interface HealthPayload {
  status: "ok" | "degraded" | "down";
  uptime?: number;
  timestamp?: string;
}

export async function getHealth(): Promise<HealthPayload> {
  const result = await apiFetch<HealthPayload>("/api/v1/health", {
    cache: "no-store",
  });
  return result.data;
}
