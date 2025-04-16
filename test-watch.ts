import { assert } from "jsr:@std/assert";
import { Convo } from "./relay.ts";

Deno.test("conversation splits", () => {
  const c = new Convo(
    "respond with 'resp' if the user says test, otherwise mimic the user's response exactly.",
  );
  const c2 = c.clone();
  c.user("test");
  let mout = c.model("resp");
  assert(mout == "resp", "expected 'resp', got value '" + mout + "'.");
  c.user("123abc");
  mout = c.model("123abc");
  assert(mout == "123abc", "expected '123abc', got value '" + mout + "'.");
  c2.user("as5");
  mout = c2.model("as5");
  assert(mout == "as5", "expected 'as5', got value '" + mout + "'.");
  assert(c.messages.length == 4);
  assert(c2.messages.length == 2);
});

Deno.test("conversation basic", () => {
  const c = new Convo(
    "respond with 'resp' if the user says test, otherwise mimic the user's response exactly.",
  );
  c.user("test");
  let mout = c.model("resp");
  assert(mout == "resp", "expected 'resp', got value '" + mout + "'.");
  c.user("123abc");
  mout = c.model("123abc");
  assert(mout == "123abc", "expected '123abc', got value '" + mout + "'.");

  const c2 = new Convo(
    "Respond with 0-1 values to represent the red-ness and blue-ness of the user's input.",
  );
  c2.user("purple");
  type rb = {
    red: number;
    blue: number;
  };
  const moutrb: rb = c2.model({
    red: 0.5,
    blue: 0.5,
  });
  assert(
    moutrb.blue >= 0.1 && moutrb.blue <= 0.9 && moutrb.red >= 0.1 &&
      moutrb.red <= 0.9,
    "Expected red and blue to be between 0.1 and 0.9" + JSON.stringify(moutrb),
  );
});
