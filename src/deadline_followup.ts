import { randomUUID } from "node:crypto";
import { infrai } from "./infrai_client.js";
import { decideSend, matterRequest, createMemorySuppression, type MatterRequest, type SuppressionStore } from "./suppression_policy.js";

export async function deliverMatterSms(input: unknown, suppressed: SuppressionStore = createMemorySuppression()) {
  const request = matterRequest.parse(input);
  if (decideSend(request, suppressed) === "suppress") {
    return { matterId: request.matterId, decision: "suppressed" as const };
  }
  const data = await infrai.sms.batch.send({ messages: [{ to: request.phone, body: request.message }] }, `matter-${request.matterId}-${request.event}`);
  return { matterId: request.matterId, decision: "sent" as const, data };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const request: MatterRequest = {
    matterId: process.env.MATTER_ID ?? "matter-demo",
    phone: process.env.MATTER_PHONE ?? "+15555550100",
    event: "deadline",
    message: "Your filing deadline is tomorrow. Reply to your legal team for help."
  };
  console.log(await deliverMatterSms(request));
}
