#!/usr/bin/env node
/**
 * Verifies SEO/verification files are served with HTTP 200 and expected content.
 *
 * Usage:
 *   node scripts/verify-seo-files.mjs [baseUrl]            # single run
 *   node scripts/verify-seo-files.mjs --wait [baseUrl]     # poll until all pass or budget exhausted
 *
 * Env:
 *   SEO_VERIFY_BASE_URL    Override base URL (alternative to positional arg)
 *   SEO_VERIFY_TIMEOUT_MS  Max wait time in --wait mode (default 1800000 = 30 min)
 *   SEO_VERIFY_INTERVAL_MS Poll interval in --wait mode  (default 30000 = 30 sec)
 *   SEO_ALERT_WEBHOOK_URL  Optional: POSTs JSON failure summary on final failure
 *
 * Exit code is 0 only when all checks pass.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const WAIT = args.includes("--wait");
const positional = args.filter((a) => !a.startsWith("--"));
const BASE = (
  positional[0] ??
  process.env.SEO_VERIFY_BASE_URL ??
  "https://https-smilecart-app.lovable.app"
).replace(/\/$/, "");

const TIMEOUT_MS = Number(process.env.SEO_VERIFY_TIMEOUT_MS ?? 30 * 60 * 1000);
const INTERVAL_MS = Number(process.env.SEO_VERIFY_INTERVAL_MS ?? 30 * 1000);
const WEBHOOK = process.env.SEO_ALERT_WEBHOOK_URL;

const PUBLIC_DIR = new URL("../public/", import.meta.url).pathname;

function buildChecks() {
  const checks = [];
  for (const file of readdirSync(PUBLIC_DIR)) {
    if (/^google[\w-]+\.html$/i.test(file)) {
      const body = readFileSync(join(PUBLIC_DIR, file), "utf8").trim();
      checks.push({
        label: `Google verification: ${file}`,
        url: `${BASE}/${file}`,
        contains: `google-site-verification: ${file}`,
        expectedBody: body,
        contentType: /text\/html/i,
      });
    }
  }
  const bingBody = readFileSync(join(PUBLIC_DIR, "BingSiteAuth.xml"), "utf8").trim();
  checks.push({
    label: "Bing verification: BingSiteAuth.xml",
    url: `${BASE}/BingSiteAuth.xml`,
    contains: "<user>",
    expectedBody: bingBody,
    contentType: /xml/i,
  });
  checks.push({
    label: "robots.txt",
    url: `${BASE}/robots.txt`,
    contains: "User-agent:",
    contentType: /text\/plain/i,
  });
  checks.push({
    label: "sitemap.xml",
    url: `${BASE}/sitemap.xml`,
    contains: "<urlset",
    contentType: /xml/i,
  });
  return checks;
}

async function runOnce(checks) {
  const failures = [];
  for (const c of checks) {
    try {
      const res = await fetch(c.url, { redirect: "manual" });
      const body = await res.text();
      const okStatus = res.status === 200;
      const okBody = c.contains ? body.includes(c.contains) : true;
      const okType = c.contentType
        ? c.contentType.test(res.headers.get("content-type") ?? "")
        : true;
      const okExact = c.expectedBody ? body.trim() === c.expectedBody : true;
      const ok = okStatus && okBody && okType && okExact;
      const symbol = ok ? "✓" : "✗";
      console.log(`${symbol} ${c.label} [${res.status}] ${c.url}`);
      if (!ok) {
        const reasons = [];
        if (!okStatus) reasons.push(`expected 200, got ${res.status}`);
        if (!okType)
          reasons.push(`unexpected content-type: ${res.headers.get("content-type")}`);
        if (!okBody) reasons.push(`body missing: "${c.contains}"`);
        if (!okExact) reasons.push(`body did not exactly match public/ file`);
        reasons.forEach((r) => console.log(`   ${r}`));
        failures.push({ label: c.label, url: c.url, status: res.status, reasons });
      }
    } catch (err) {
      console.log(`✗ ${c.label} — network error: ${err.message}`);
      failures.push({ label: c.label, url: c.url, reasons: [`network: ${err.message}`] });
    }
  }
  console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);
  return failures;
}

async function notifyFailure(failures) {
  if (!WEBHOOK) return;
  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: BASE,
        timestamp: new Date().toISOString(),
        failures,
      }),
    });
    console.log(`→ Posted failure summary to ${WEBHOOK}`);
  } catch (err) {
    console.log(`→ Failed to post to webhook: ${err.message}`);
  }
}

const checks = buildChecks();
console.log(`Verifying SEO files at ${BASE} (${checks.length} checks)${WAIT ? ` — polling up to ${Math.round(TIMEOUT_MS / 60000)}m` : ""}\n`);

let failures = await runOnce(checks);

if (WAIT && failures.length > 0) {
  const deadline = Date.now() + TIMEOUT_MS;
  let attempt = 1;
  while (failures.length > 0 && Date.now() < deadline) {
    const remaining = Math.max(0, deadline - Date.now());
    console.log(
      `\n⏳ ${failures.length} failing — retry in ${INTERVAL_MS / 1000}s (${Math.round(remaining / 1000)}s budget left)\n`,
    );
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    attempt++;
    console.log(`--- Attempt ${attempt} ---`);
    failures = await runOnce(checks);
  }
}

if (failures.length > 0) {
  await notifyFailure(failures);
  process.exit(1);
}
process.exit(0);
