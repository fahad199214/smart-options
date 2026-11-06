import test from "node:test";
import assert from "node:assert/strict";
import { checkBasic, parseUsers, MAX_USERS } from "../lib/auth.ts";
const h = (s: string) => "Basic " + Buffer.from(s, "utf8").toString("base64");
test("قراءة قائمة المستخدمين", () => {
  assert.deepEqual(parseUsers("fahad:Aa1, ali:Bb2 ,bad, :nouser,noPass:"), [{ user: "fahad", pass: "Aa1" }, { user: "ali", pass: "Bb2 " }].map((x, i) => i === 1 ? { user: "ali", pass: "Bb2" } : x));
  assert.deepEqual(parseUsers(undefined, undefined, "x"), [{ user: "admin", pass: "x" }]);
  assert.deepEqual(parseUsers("", "me", ""), []);
  assert.equal(parseUsers(Array.from({ length: 15 }, (_, i) => `u${i}:p${i}`).join(",")).length, MAX_USERS);
  assert.deepEqual(parseUsers("a:b:c"), [{ user: "a", pass: "b:c" }]);
});
test("الدخول لعدة مستخدمين", () => {
  const c = parseUsers("fahad:Aa1,ali:Bb2");
  assert.equal(checkBasic(h("fahad:Aa1"), c), "fahad");
  assert.equal(checkBasic(h("ali:Bb2"), c), "ali");
  assert.equal(checkBasic(h("ali:Aa1"), c), null); // كلمة مرور مستخدم آخر
  assert.equal(checkBasic(h("fahad:Aa"), c), null);
  assert.equal(checkBasic(h("x:y"), []), null);
  assert.equal(checkBasic(null, c), null); assert.equal(checkBasic("Bearer z", c), null); assert.equal(checkBasic("Basic !!!", c), null);
});
