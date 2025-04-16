import { assert } from "jsr:@std/assert";
import { Convo } from "./relay.ts";
import { GeminiModel } from "./gemini.ts";

Deno.test("conversation with live api", async () => {
  const mm = new GeminiModel();
  const c = new Convo(
    "respond with 'resp' if the user says test, otherwise mimic the user's response exactly.",
  );
  c.user("test");
  let mout = c.model(await mm.gen(c));
  assert(mout == "resp", "expected 'resp', got value '" + mout + "'.");
  c.user("123abc");
  mout = c.model(await mm.gen(c));
  assert(mout == "123abc", "expected '123abc', got value '" + mout + "'.");

  const c2 = new Convo(
    "Respond with 0-1 values to represent the red-ness and blue-ness of the user's input.",
  );
  c2.user("purple");
  type rb = {
    red: number;
    blue: number;
  };
  const moutrb: rb = await mm.gen(c2, {
    type: "object",
    required: ["red", "blue"],
    properties: {
      red: {
        type: "number",
      },
      blue: {
        type: "number",
      },
    },
  });
  assert(
    moutrb.blue >= 0.1 && moutrb.blue <= 0.9 && moutrb.red >= 0.1 &&
      moutrb.red <= 0.9,
    "Expected red and blue to be between 0.1 and 0.9" + JSON.stringify(moutrb),
  );
});
