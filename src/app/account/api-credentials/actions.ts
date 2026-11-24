"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/auth";
import { createApiCredential, revokeApiCredential } from "@/server/services/api-credentials";

export type CreateState = { error: string | null; secret?: string };

export async function createAction(
  _previous: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const actor = await requireActor();
  const result = await createApiCredential(actor, String(formData.get("name") ?? ""));
  if (!result.ok) return { error: result.error };
  revalidatePath("/account/api-credentials");
  return { error: null, secret: result.secret };
}

export async function revokeAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  await revokeApiCredential(actor, String(formData.get("id") ?? ""));
  revalidatePath("/account/api-credentials");
}
