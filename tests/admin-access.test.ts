import assert from "node:assert/strict";
import test from "node:test";
import { isAdminUser, parseAdminAllowlist } from "../src/application/services/auth/adminAccess";

test("admin UUID allowlist grants access", () => {
  assert.equal(isAdminUser("user-1", "owner@example.com", ["user-1"], []), true);
});

test("admin email allowlist grants access case-insensitively", () => {
  assert.equal(isAdminUser("user-2", "Owner@Example.com", [], ["owner@example.com"]), true);
});

test("non-member is denied", () => {
  assert.equal(isAdminUser("user-3", "member@example.com", ["user-1"], ["owner@example.com"]), false);
});

test("empty allowlist denies all users", () => {
  assert.equal(isAdminUser("user-1", "owner@example.com", [], []), false);
});

test("allowlist parsing trims whitespace and comma-separated values", () => {
  assert.deepEqual(parseAdminAllowlist(" user-1, user-2 ,, user-3 "), ["user-1", "user-2", "user-3"]);
});

test("trimmed parsed allowlists work for admin matching", () => {
  const adminIds = parseAdminAllowlist(" user-1, user-2 ");
  const adminEmails = parseAdminAllowlist(" OWNER@example.com, admin@example.com ");
  assert.equal(isAdminUser("user-2", null, adminIds, adminEmails), true);
  assert.equal(isAdminUser("external", "owner@example.com", adminIds, adminEmails), true);
});

test("both empty parsed allowlists deny all users", () => {
  assert.equal(isAdminUser("user-1", "owner@example.com", parseAdminAllowlist(" , "), parseAdminAllowlist("")), false);
});
