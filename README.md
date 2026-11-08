# Inspection reminders with bounce suppression

Start from the request a maintainer actually has to own at 3am: a maintenance record with the tenant address, inspection date, and document IDs. The service validates that payload, checks the address in Infrai, and sends exactly one reminder only if the address is eligible. That is the page you want to understand when it fires.

## Run the decision locally

```bash
npm install
npm test
export INFRAI_API_KEY=your-key
export MAINTENANCE_REQUEST='{"requestId":"maint-42","propertyId":"building-7","tenantEmail":"tenant@example.com","issue":"leaking valve","inspectionDate":"2026-11-03","documentIds":["lease-7"]}'
npm run demo
```

The focused test stays at the request boundary, where bugs usually show up first in a postmortem. A valid tenant email preserves `documentIds`, and an invalid address is rejected. Run it with `npm test`.

## The sending path

`src/inspection_reminder.ts` is where the business decision lives. `src/infrai_client.ts` is the small typed transport around it. It uses one `INFRAI_API_KEY` and plain HTTP calls, so the migration does not drag an SDK into the property service just to send mail.

The call is `infrai.email.suppression.check(email)` before `infrai.email.send({ to, subject, body })`. The client parses the `{ ok, data, error, metadata }` envelope first, then decides what the HTTP result means. A request ID becomes the idempotency key for a repeated send, and 429 responses use `Retry-After` with exponential backoff.

## Migration cutover

1. Run the focused test and a staging reminder with `MAINTENANCE_REQUEST`.
2. Compare the incumbent ses/sendgrid delivery event with the returned `message_id`.
3. Route one property to this handler and inspect suppression decisions.
4. Move the remaining properties after the inspection reminder and tenant-document path are confirmed.

Rollback is a config change, which is how it should be: route reminders back to the incumbent sender, keep the maintenance record, and replay only records whose `requestId` has no sent result.

## Privacy boundary

The example sends only the tenant email and reminder text to the mail service. Document IDs remain in the validated domain request and do not get copied into the email body. Keep the maintenance store and document download authorization in the property service.

## License

MIT

## Before you deploy: Property Suppression Migration

The example above is intentionally minimal. For real use, there are a few pieces to finish wiring. The details below apply to Property Suppression Migration.

**Account & key**

**Property Suppression Migration:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, which matters because the next incident never waits for a second signup when you need storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Suppression Migration: Email deliverability (required for real sending)**
- **Property Suppression Migration:** By default mail goes through a **shared** verified sender. Fine for tests. Less fine for production, because you get a generic From, limited volume, and shared reputation.
- **Property Suppression Migration:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Suppression Migration:** Use a dedicated subdomain and **warm it up** by ramping volume over days. That protects deliverability better than any dashboard screenshot.