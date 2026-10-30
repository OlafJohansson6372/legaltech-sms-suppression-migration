import { z } from "zod";

export const matterRequest = z.object({
  matterId: z.string().min(1),
  phone: z.string().min(7),
  event: z.enum(["intake", "signed_document", "deadline"]),
  message: z.string().min(1)
});

export type MatterRequest = z.infer<typeof matterRequest>;

export type SuppressionStore = { has(phone: string): boolean; add(phone: string): void };

export function decideSend(request: MatterRequest, suppressed: SuppressionStore): "send" | "suppress" {
  return suppressed.has(request.phone) ? "suppress" : "send";
}

export function optOut(store: SuppressionStore, phone: string): void {
  store.add(phone);
}

export function createMemorySuppression(): SuppressionStore {
  const phones = new Set<string>();
  return { has: (phone) => phones.has(phone), add: (phone) => phones.add(phone) };
}
