import assert from "node:assert/strict";
import { createMemorySuppression, decideSend, matterRequest, optOut } from "../src/suppression_policy.js";

const request = matterRequest.parse({ matterId: "M-42", phone: "+15555550100", event: "signed_document", message: "Your signed document is ready." });
const suppression = createMemorySuppression();
assert.equal(decideSend(request, suppression), "send");
optOut(suppression, request.phone);
assert.equal(decideSend(request, suppression), "suppress");
console.log("opt-out decision: send -> suppress");
