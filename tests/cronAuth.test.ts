import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

function setRequiredEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.CRON_SECRET = "expected-secret";
}

async function loadCronAuth() {
  setRequiredEnv();
  return import("../src/server/jobs/cronAuth.js");
}

function requestFor(headers?: HeadersInit, query = "") {
  return new NextRequest(`https://example.com/api/jobs/test${query}`, { headers });
}

test("assertCronAuthorized accepts a valid Bearer header", async () => {
  const { assertCronAuthorized } = await loadCronAuth();

  const response = assertCronAuthorized(requestFor({ authorization: "Bearer expected-secret" }));

  assert.equal(response, null);
});

test("assertCronAuthorized rejects an invalid Bearer header", async () => {
  const { assertCronAuthorized } = await loadCronAuth();

  const response = assertCronAuthorized(requestFor({ authorization: "Bearer wrong-secret" }));

  assert.equal(response?.status, 401);
});

test("assertCronAuthorized rejects missing Authorization header", async () => {
  const { assertCronAuthorized } = await loadCronAuth();

  const response = assertCronAuthorized(requestFor());

  assert.equal(response?.status, 401);
});

test("assertCronAuthorized rejects query-param secret without Authorization header", async () => {
  const { assertCronAuthorized } = await loadCronAuth();

  const response = assertCronAuthorized(requestFor(undefined, "?secret=expected-secret"));

  assert.equal(response?.status, 401);
});

test("assertCronAuthorized returns 503 when CRON_SECRET is not configured", async () => {
  const { assertCronAuthorized } = await loadCronAuth();
  const { env } = await import("../src/infrastructure/config/env.js");
  const previousSecret = env.CRON_SECRET;
  env.CRON_SECRET = undefined;

  try {
    const response = assertCronAuthorized(requestFor({ authorization: "Bearer expected-secret" }));

    assert.equal(response?.status, 503);
  } finally {
    env.CRON_SECRET = previousSecret;
  }
});
