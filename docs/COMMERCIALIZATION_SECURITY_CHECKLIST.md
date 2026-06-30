# Commercialization Security & Readiness Checklist

**Status:** Planning doc (advisory). Created 2026-06-26.
**Scope:** Pre-launch security, operations, and readiness for ETFVision at a target of ~500 users / ~400 instruments on Vercel + Supabase.
**Legend:** 🟢 Barebones (do before paying users) · ⚪ Defer (when you scale / have revenue). Gap refs point to `docs/DOCUMENTATION_GAPS.md`.

> This is a non-code planning checklist. None of these items change scoring, methodology, frozen anchors, or compliance vocabulary.

---

## 1. Patch management
- [ ] 🟢 **Dependency updates on a cadence** — `npm audit` / Dependabot (free, GitHub-native) for advisories on deps. Review ~weekly.
- [ ] 🟢 **Patch-safely gate** — never patch straight to prod: PR → CI (typecheck + tests + build) → preview → merge. The dev→main→alpha flow already enforces this.
- [ ] 🟢 **Staging soak** — let a patch sit on alpha before it's "blessed," so regressions surface before real users hit them.
- [ ] 🟢 **Instant rollback** — Vercel one-click rollback as the safety net. (Free.)
- [ ] ⚪ **Golden regression suite** to prove patches don't break the *numbers* — gap **Med 26**. This is what makes "how do I know a patch won't break the app" answerable for a financial app.

## 2. Application hardening
- [ ] 🟢 **Security-headers bundle** (`next.config`/middleware, ~½ day): CSP, `X-Frame-Options: DENY`/`frame-ancestors` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, **HSTS**. Free.
- [ ] 🟢 **HTTPS everywhere** — Vercel TLS (free) + HSTS so browsers refuse downgrades.
- [ ] 🟢 **RLS enforced** on every user table (per-user isolation) + **route-level auth** on all pages/APIs — gap **High 2**.
- [ ] 🟢 **No secret leakage** — service-role/admin key + API keys server-only, never in client bundle or logs — gap **High 4**.
- [ ] 🟢 **Framework defaults verified** — React auto-escaping (audit any `dangerouslySetInnerHTML`); Supabase bearer tokens (set `SameSite` on any cookie sessions).
- [ ] 🟢 **Error monitoring** — Sentry to catch runtime/security errors in prod — gap **Med 38**.
- [ ] 🟢 **Hardening test pass:** `npm audit` + a security-headers scanner (e.g. securityheaders.com) + a fresh-account RLS check (log in as user B, try to read user A's data → must fail).
- [ ] ⚪ **Fable 5 as a triage layer** over Sentry/logs — a reviewer of alerts, *not* a sensor.
- [ ] ⚪ **Professional pen-test** — when you have real users/revenue.

## 3. Multi-factor authentication
- [ ] 🟢 **Enable Supabase native TOTP MFA** — free, no Google charge (authenticator apps are free; only SMS OTP costs money — avoid SMS).
- [ ] 🟢 **Enforce MFA on your own admin/operator account** at minimum.
- [ ] 🟢 **Gate sensitive actions on `aal2`** (MFA-verified) vs `aal1` (password only).
- [ ] ⚪ **Mandatory MFA for all users** — optional at launch; offer it, require it for admin.

## 4. Restricting admin privileges
- [ ] 🟢 **No full RBAC needed solo** — an operations SOP is fine.
- [ ] 🟢 **Keep two technical blast-radius controls even solo:** (a) `service_role`/admin key stays **server-only** (`server-only` guard, rotatable) — gap **High 4**; (b) `/admin/*` routes **gated** so a regular user can't reach them — gap **High 2**.
- [ ] 🟢 **Operations SOP** for destructive ops (migrations, deletes), including "backup before destructive op."
- [ ] ⚪ **Real RBAC** — only when a second human joins the team.

## 5. Backups & recovery
- [ ] 🟢 **Supabase Pro daily backups** (included; Free tier isn't enough for real users).
- [ ] 🟢 **One tested restore drill** — a backup you've never restored isn't a backup — gap **Med 31**.
- [ ] 🟢 **Backup-before-destructive-op** in the SOP (migrations/deletes).
- [ ] 🟢 **Migration ledger in git** = schema source of truth.
- [ ] 🟢 **Prioritize user tables** (`portfolios`, `transactions`, `holdings`, `cash_balances`) — irreplaceable; market data is re-fetchable from FMP.
- [ ] ⚪ **Cheap off-platform `pg_dump`** to your own storage (pennies) — DR if the Supabase project itself is lost.
- [ ] ⚪ **PITR** (~$100/mo+ for 7-day retention, scales with window) — **turn on when you onboard real money**, not before.
- [ ] ⚪ **Retention/deletion policy reconciled with backups** (PDPA/GDPR) — gap **High 10**.

## 6. DDoS & abuse
- [ ] 🟢 **Platform DDoS (L3/L4)** — automatic via Vercel edge, free (no action; just know it's there).
- [ ] 🟢 **Spend caps + budget alerts** on Vercel **and** Supabase — the #1 solo control (turns a cost-DoS into an annoyance, not a bill).
- [ ] 🟢 **Confirm Supabase auth rate limits are on** (brute-force / credential-stuffing).
- [ ] ⚪ **App-level rate limiting** (Vercel firewall / Upstash) — only if you expose a heavy public API.
- [ ] ⚪ **Vercel WAF / advanced firewall rules.**

## 7. Website & email spoofing
- [ ] 🟢 **HTTPS + HSTS + MFA** — reduce damage from lookalike-site phishing.
- [ ] 🟢 **SPF + DKIM + DMARC (`reject`)** on the sending domain — kills email spoofing; one-time DNS setup, free. Do it when transactional email is set up.
- [ ] ⚪ **Defensive typosquat domain registration + brand/lookalike monitoring.**

## 8. Data limits & scaling (informational, not a blocker)
- [ ] 🟢 At **500 users / 400 instruments you're a few GB** — well under Supabase Pro's ~8 GB; overage ~$0.125/GB. No action needed.
  - Reference: post-`raw_payload` cleanup the universe DB is ~447 MB; user snapshot tables grow ~1 GB/yr at 500 users.
- [ ] ⚪ **Snapshot-retention/rollup policy** — daily per-holding snapshots are the only unbounded grower; matters at 5,000+ users, not 500.

## 9. Load testing & UAT (pre-launch)
- [ ] 🟢 **One load test** (`k6`/Artillery, ~50–100 concurrent) on dashboard + instrument detail → watch p95 latency, Supabase CPU, connection count.
- [ ] 🟢 **Confirm connection pooling (Supavisor)** — prod uses the **pooled** connection string. The #1 thing load testing surfaces.
- [ ] 🟢 **Calculation-correctness UAT** — spot-check displayed numbers vs manual/Excel + golden suite — gap **Med 26**. Existential for a financial app.
- [ ] 🟢 **Fresh-account functional UAT** — full journey on a brand-new account — gaps **Med 32 + Med 39 (empty states)**.
- [ ] 🟢 **Data-freshness UAT** — cron chain produces fresh data end-to-end — gap **Med 33**.
- [ ] 🟢 **Smoke tests post-deploy** — automated "does `/portfolio` return 200."
- [ ] 🟢 **AI-output UAT** — assistant doesn't hallucinate / give advice — gap **Med 27**.
- [ ] ⚪ **Endurance/soak, chaos/failure injection, full cross-browser + accessibility audits** — gaps **Low 10/11**.

---

## The barebones set, summarized
A small, mostly free/config list to clear before paying users:

1. Security-headers bundle + SPF/DKIM/DMARC
2. Supabase TOTP MFA on (enforced for admin)
3. Spend caps + budget alerts (Vercel + Supabase)
4. RLS + route-auth + service-role key server-only (gaps High 2 / High 4)
5. Sentry error monitoring (gap Med 38)
6. Supabase daily backups + one tested restore drill (gap Med 31)
7. One load test confirming connection pooling
8. Calculation-correctness + fresh-account UAT pass (gaps Med 26 / 32 / 39)

Everything marked ⚪ waits for real users / revenue.
