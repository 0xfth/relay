import { assert, assertEquals } from "jsr:@std/assert";
import { Convo, type Slot, Worker, WorkerController } from "./relay.ts";
import { MocController, MocLoggerComponent, MocModel } from "@/moc.ts";
Deno.test("slots", () => {
  const _s: Slot = {
    name: "Moc Slot",
    instructions: "none",
    worker: null,
    components: [],
  };
});
Deno.test("worker control", async () => {
  const mm = new MocModel();
  type ttype = {
    a: string;
  };
  mm.rig(JSON.stringify({ "a": "b" }));
  mm.rig("abc");
  const worker: Worker = new Worker(mm);
  const wc = new WorkerController(worker, new Convo());
  wc.put("hello!");
  const resp = await wc.get("somemsg");
  assertEquals(wc.convo.messages.length, 3, "conversation length mismatch");
  assertEquals(wc.convo.messages[0].mime, "plain/text");
  assertEquals(wc.convo.messages[1].mime, "plain/text");
  assertEquals(wc.convo.messages[2].mime, "plain/text");
  assertEquals(resp, "abc", "response mismatch");
  const resp2: ttype = await wc.get({ type: "object" }) ?? { a: "" };
  assertEquals(wc.convo.messages.length, 4, "conversation length mismatch");
  assertEquals(wc.convo.messages[3].mime, "application/json");
  assertEquals(resp2.a, "b", "response mismatch");
});
Deno.test("controller/component communication", async () => {
  const mcont = new MocController();
  const mcmp = new MocLoggerComponent();
  mcont.rig("123");
  mcont.rig("adsf");
  await mcmp.interact(mcont);
  await mcmp.interact(mcont);
  assert(mcmp.log[0] == "adsf");
  assert(mcmp.log[1] == "123");
});
Deno.test("conversation cloning", () => {
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
Deno.test("basic conversation", () => {
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
