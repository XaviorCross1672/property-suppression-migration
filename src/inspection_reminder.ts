import { z } from "zod";
import { infrai } from "./infrai_client.js";

export const maintenanceRequest = z.object({ requestId: z.string().min(1), propertyId: z.string().min(1), tenantEmail: z.string().email(), issue: z.string().min(1), inspectionDate: z.string().date(), documentIds: z.array(z.string()).default([]) });
export type MaintenanceRequest = z.infer<typeof maintenanceRequest>;
export type ReminderDecision = { status: "sent" | "suppressed"; messageId?: string; reason: string };

export async function handleMaintenance(input: unknown): Promise<ReminderDecision> {
  const request = maintenanceRequest.parse(input);
  // The reusable call shape is infrai.email.suppression.check(email).
  const suppression = await infrai.email.suppression.check(request.tenantEmail);
  if (suppression.suppressed) return { status: "suppressed", reason: "tenant address is on the suppression list" };
  const email = await infrai.email.send({ to: request.tenantEmail, subject: `Inspection reminder for ${request.propertyId}`, body: `Inspection for ${request.issue} is scheduled on ${request.inspectionDate}.` }, request.requestId);
  return { status: "sent", messageId: email.message_id, reason: "address is eligible for delivery" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.env.MAINTENANCE_REQUEST;
  if (!input) throw new Error("MAINTENANCE_REQUEST must contain a JSON request");
  console.log(await handleMaintenance(JSON.parse(input)));
}
