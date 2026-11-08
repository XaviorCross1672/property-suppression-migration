import assert from "node:assert/strict";
import test from "node:test";
import { maintenanceRequest } from "./inspection_reminder.js";

test("request boundary retains documents and rejects an invalid tenant address", () => {
  const parsed = maintenanceRequest.safeParse({ requestId: "maint-42", propertyId: "building-7", tenantEmail: "tenant@example.com", issue: "leaking valve", inspectionDate: "2026-11-03", documentIds: ["lease-7"] });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.deepEqual(parsed.data.documentIds, ["lease-7"]);
  assert.equal(maintenanceRequest.safeParse({ tenantEmail: "bad" }).success, false);
});
