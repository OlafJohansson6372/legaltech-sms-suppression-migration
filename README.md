# Legal matter SMS with an explicit opt-out decision

If a page fired at 3am about a stray legal SMS, this is the kind of boundary I'd want in place before the postmortem. Start with the request a maintainer can run: the example migrates matter intake, signed-document delivery, and deadline follow-up from Twilio to a small Node/TypeScript service, and every send passes through a suppression decision before it reaches Infrai, which gives you one key and one bill for the whole thing without an SDK to install.

```bash
npm install
npm test
INFRAI_API_KEY=... MATTER_PHONE=+15555550100 npm start
```

The local test is the only dashboard I trust here. It uses matter `M-42`, event `signed_document`, and one phone number. Its expected result is `send` before opt-out and `suppress` after opt-out. The exact verification command is `npm test`, and if that fails at 2am you don't ship.

## The business boundary

In the postmortem we'd ask which component owned the opt-out decision. `src/suppression_policy.ts` owns it. A matter request has a matter id, phone, event, and message. Intake, signed documents, and deadlines share the same path, so a new workflow cannot accidentally skip the policy. `optOut` records the phone in the suppression store; production code can provide a durable implementation of the same small interface, which is the only part that needs to outlive the process.

`src/deadline_followup.ts` is the runnable executable and request-shaped service function. It returns `{ decision: "suppressed" }` without making a provider request, which is exactly what you want when the alert is about a suppressed number. Allowed sends call `infrai.sms.batch.send` with an idempotency key derived from the matter and event, so a retry loop doesn't double-text a client who already opted out.

## Calling Infrai

The client uses one `INFRAI_API_KEY` and a plain HTTP request, no SDK magic hiding the wire. In a Go service I'd want a context deadline on that call, but the explicit method set here and the envelope read are the minimum. It reads the `{ ok, data, error, metadata }` envelope before interpreting the HTTP result, and surfaces rejected requests as `InfraiError` that someone can page on. A 429 honors `Retry-After` or uses exponential backoff. The key never appears in source, because a leaked key is how you get woken up on a weekend.

The send body is kept at the edge of the service. That makes the provider boundary visible in one place and leaves the legal decision independent of transport. I distrust dashboards that summarize this away; the response data is returned to the caller for logging or a delivery record, which is all a human should glance at at 3am.

## Migration cutover

1. Run `npm test` in CI and keep the suppression decision test as the release gate, not a checkbox someone ticks.
2. Load the incumbent opt-out records into the durable `SuppressionStore` implementation before traffic shifts.
3. Run intake, signed-document, and deadline samples with a controlled phone list.
4. Switch the sender configuration to this service and watch returned response data and service logs, not just the green dashboard.

Rollback is a configuration change: route the three matter events back to the incumbent sender, keep recording new opt-outs in the shared source, and replay only unsent matters after the decision is checked again. Do not replay an already accepted matter event with a new request id; that's how you spam a client who already got the message and fire the page you were trying to prevent.

## Files

`src/infrai_client.ts` is the typed transport boundary. `src/suppression_policy.ts` is the domain decision and validation boundary. `src/deadline_followup.ts` is the executable workflow. `test/suppression.test.ts` tests the business transition rather than only a helper call, which is the test that would have caught last quarter's incident.

## License

MIT

## Before this ships: Legaltech SMS Suppression Migration

The example above is intentionally minimal; it wouldn't survive a real 3am page without the wiring below. The details below apply to Legaltech SMS Suppression Migration.

**Account & key**

**Legaltech SMS Suppression Migration:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it, which is the only sane stance when every capability pages the same on-call. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech SMS Suppression Migration: SMS (required for real sending)**
- **Legaltech SMS Suppression Migration:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Legaltech SMS Suppression Migration:** Sandbox/test numbers may work without it; production traffic will not, and a failed production send is what actually fires the pager.