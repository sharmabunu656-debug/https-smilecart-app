#!/usr/bin/env node
/**
 * Verifies SEO/verification files are served with HTTP 200 and expected content.
 * Usage: node scripts/verify-seo-files.mjs [baseUrl]
 *   defaults to https://https-smilecart-app.lovable.app
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "https://https-smilecart-app.lovable.app").replace(/\/$/, "");
const PUBLIC_DIR = new URL("../public/", import.meta.url).pathname;

const checks = [];

// Google site-verification files (google*.html)
for (const file of readdirSync(PUBLIC_DIR)) {
  if (/^google[\w-]+\.html$/i.test(file)) {
    const body = readFileSync(join(PUBLIC_DIR, file), "utf8").trim();
    checks.push({
      label: `Google verification: ${file}`,
      url: `${BASE}/${file}`,
      contains: `google-site-verification: ${file}`,
      expectedBody: body,
    });
  }
}

// Bing
checks.push({
  label: "Bing verification: BingSiteAuth.xml",
  url: `${BASE}/BingSiteAuth.xml`,
  contains: "<user>",
  contentType: /xml/i,
});

// robots.txt
checks.push({
  label: "robots.txt",
  url: `${BASE}/robots.txt`,
  contains: "User-agent:",
  contentType: /text\/plain/i,
});

// sitemap.xml
checks.push({
  label: "sitemap.xml",
  url: `${BASE}/sitemap.xml`,
  contains: "<urlset",
  contentType: /xml/i,
});

let failures = 0;
for (const c of checks) {
  try {
    const res = await fetch(c.url, { redirect: "manual" });
    const body = await res.text();
    const okStatus = res.status === 200;
    const okBody = c.contains ? body.includes(c.contains) : true;
    const okType = c.contentType ? c.contentType.test(res.headers.get("content-type") ?? "") : true;
    const okExact = c.expectedBody ? body.trim() === c.expectedBody : true;
    const ok = okStatus && okBody && okType && okExact;
    const symbol = ok ? "✓" : "✗";
    console.log(`${symbol} ${c.label} [${res.status}] ${c.url}`);
    if (!ok) {
      failures++;
      if (!okStatus) console.log(`   expected 200, got ${res.status}`);
      if (!okType) console.log(`   unexpected content-type: ${res.headers.get("content-type")}`);
      if (!okBody) console.log(`   body missing: "${c.contains}"`);
      if (!okExact) console.log(`   body did not exactly match public/ file`);
    }
  } catch (err) {
    failures++;
    console.log(`✗ ${c.label} — network error: ${err.message}`);
  }
}

console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
process.exit(failures === 0 ? 0 : 1);
