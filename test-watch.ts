import { assert, assertEquals } from "jsr:@std/assert";
import { Convo, type SlotConfig } from "./relay.ts";
import { HelloWorldComponent } from "@/components/HelloWorldComponent.ts"; // Import example component

import { Slot } from "@/slot.ts";
import { delay } from "jsr:@std/async/delay";

// --- Integration Test Helper: Mock Agent ---
// This function simulates an external agent connecting to the Slot via WebSocket.
async function runMockAgentForTest(url: string): Promise<boolean> {
  console.log(`[TestAgent] Connecting to ${url}`);
  let ws: WebSocket;
  let interactionComplete = false;
  let interactionError: Error | null = null;

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error("[TestAgent] Connection failed:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      return reject(new Error(`WebSocket connection failed: ${errorMsg}`));
    }
    const timeout = setTimeout(() => {
      console.error("[TestAgent] Test timed out.");
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1011, "Test Timeout");
      }
      reject(new Error("Agent interaction timed out"));
    }, 15000); // 15 second timeout

    ws.onopen = () => {
      console.log("[TestAgent] Connected.");
    };

    ws.onmessage = (event) => {
      try {
        const request = JSON.parse(event.data);
        console.log("[TestAgent] Received:", JSON.stringify(request));
        const id = request.id;
        if (!id) {
          console.warn("[TestAgent] Received message without ID, ignoring.");
          return;
        }

        let responseContent: unknown = null;
        let error: string | undefined = undefined;
        const requestContent = request.content;

        // Mock agent logic tailored for HelloWorldComponent
        if (typeof requestContent === "string") {
          const queryLower = requestContent.toLowerCase();
          if (queryLower.includes("what is your name")) {
            responseContent = "TestAgent Mocky"; // Respond to the name query
          } else if (queryLower.includes("pick a color")) {
            responseContent = "Okay, I pick [green]"; // Respond to the color pick query
          } else if (queryLower.includes("shall we finish")) {
            responseContent = "Yes, confirmed."; // Respond to the confirmation query
          } else if (queryLower.startsWith("hello from component")) {
            // This is a 'put', handled below by 'info' check, but can be ack'd here if needed
            console.log(
              "[TestAgent] Received initial greeting from component.",
            );
            responseContent = {
              status: "acknowledged",
              receivedInfo: requestContent,
            };
            // For put, the controller doesn't necessarily wait for a response other than ack,
            // but we send one anyway for robustness in the mock.
          } else {
            console.warn(
              `[TestAgent] Received unexpected string query: "${requestContent}"`,
            );
            responseContent = `Agent Ack: ${requestContent}`;
          }
        } else if (
          typeof requestContent === "object" && requestContent !== null &&
          "info" in requestContent
        ) {
          // Handle 'put' messages from the Controller
          const info = (requestContent as any).info;
          console.log(`[TestAgent] Received INFO: ${JSON.stringify(info)}`);
          responseContent = { status: "acknowledged", receivedInfo: info }; // Send ack

          // Check if this is the final message before the component finishes
          if (
            typeof info === "string" && info.includes("finishing interaction")
          ) {
            console.log(
              "[TestAgent] Received final component message 'finishing interaction'. Closing connection.",
            );
            interactionComplete = true;
            // Don't send response, just close after receiving final put
            ws.close(1000, "Interaction Complete");
            return; // Stop processing after initiating close
          } else if (
            typeof info === "string" && info.includes("Nice to meet you")
          ) {
            console.log("[TestAgent] Received follow-up greeting.");
          } else if (typeof info === "string" && info.includes("You picked")) {
            console.log("[TestAgent] Received confirmation of color pick.");
          }
        } else {
          console.warn(
            `[TestAgent] Received unexpected request content type: ${typeof requestContent}`,
            requestContent,
          );
          error = "Unknown content type";
        }

        // Prepare and send response only if no error and connection is open
        if (ws.readyState === WebSocket.OPEN) {
          const response: { id: string; content?: unknown; error?: string } = {
            id,
          };
          if (error) {
            response.error = error;
            console.error(
              `[TestAgent] Sending error response for ${id}: ${error}`,
            );
          } else {
            response.content = responseContent;
            console.log(
              `[TestAgent] Sending response for ${id}:`,
              JSON.stringify(response.content),
            );
          }
          ws.send(JSON.stringify(response));
        } else {
          console.warn(
            `[TestAgent] WebSocket not open, cannot send response for ${id}`,
          );
        }
      } catch (err) {
        console.error("[TestAgent] Error processing message:", err);
        clearTimeout(timeout); // Ensure timeout is cleared on processing error
        interactionError = err instanceof Error ? err : new Error(String(err));
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1011, "Agent Processing Error");
        }
        reject(err); // Reject the main promise
      }
    };

    ws.onerror = (event) => {
      const errorMsg = event instanceof ErrorEvent ? event.message : event.type;
      console.error("[TestAgent] WebSocket error:", errorMsg);
      clearTimeout(timeout);
      interactionError = new Error(`WebSocket error: ${errorMsg}`);
      // Don't reject immediately, let onclose handle it for cleaner state management
    };

    ws.onclose = (event) => {
      // --- Ensure timeout is cleared FIRST ---
      console.log("[TestAgent] Clearing watchdog timer.");
      clearTimeout(timeout);
      // --- Now log and resolve/reject ---
      console.log(
        `[TestAgent] Connection closed (Code: ${event.code}, Reason: "${event.reason}")`,
      );
      if (event.code === 1000 && interactionComplete) {
        console.log("[TestAgent] Interaction successful, resolving promise.");
        resolve(true); // Success! Interaction completed as expected.
      } else {
        console.log(
          "[TestAgent] Interaction unsuccessful or unexpected close, rejecting promise.",
        );
        // If closed unexpectedly or for other reasons
        reject(
          interactionError ?? // Use error from onerror if it occurred
            new Error(
              `Agent closed unexpectedly (Code: ${event.code}, Reason: "${event.reason}")`,
            ),
        );
      }
    };
  });
}

// --- Unit Tests for Core Logic (No Mocks Needed) ---

Deno.test("Convo: basic conversation management", () => {
  const c = new Convo("Test System Prompt");
  c.user("Hello");
  c.model("Hi there!");
  c.user({ query: "details", type: "request" });
  c.model({ status: "success", data: [1, 2] });

  assertEquals(c.messages.length, 4);
  assertEquals(c.messages[0].role, "user");
  assertEquals(c.messages[0].content, "Hello");
  assertEquals(c.messages[0].mime, "text/plain");

  assertEquals(c.messages[1].role, "model");
  assertEquals(c.messages[1].content, "Hi there!");
  assertEquals(c.messages[1].mime, "text/plain");

  assertEquals(c.messages[2].role, "user");
  assertEquals(c.messages[2].content, `{"query":"details","type":"request"}`);
  assertEquals(c.messages[2].mime, "application/json");

  assertEquals(c.messages[3].role, "model");
  assertEquals(c.messages[3].content, `{"status":"success","data":[1,2]}`);
  assertEquals(c.messages[3].mime, "application/json");

  assertEquals(c.system, "Test System Prompt");
});

Deno.test("Convo: conversation cloning", () => {
  const c = new Convo("Original System Prompt");
  c.user("First message");
  c.model("First response");

  const c2 = c.clone();
  c2.system = "Cloned System Prompt";
  c2.user("Second message for clone");
  console.log(c2);

  // Verify original convo is unchanged
  assertEquals(c.messages.length, 2);
  assertEquals(c.messages[1].content, "First response");
  assertEquals(c.system, "Original System Prompt");

  // Verify cloned convo has changes
  assertEquals(c2.messages.length, 3);
  assertEquals(c2.messages[2].content, "Second message for clone");
  assertEquals(c2.system, "Cloned System Prompt");

  // Ensure deep copy of messages
  c.messages[0].content = "Modified original";
  assert(
    c2.messages[0].content === "First message",
    "Clone's messages should not reflect changes to original's messages",
  );
});

// --- Configuration Test ---

Deno.test("Slot: configuration validation", () => {
  const config: SlotConfig = {
    name: "Test Slot Config",
    port: 9999, // Example port
    rootComponent: new HelloWorldComponent(),
  };
  assertEquals(config.name, "Test Slot Config");
  assertEquals(config.port, 9999);
  assert(
    config.rootComponent instanceof HelloWorldComponent,
    "rootComponent should be an instance of HelloWorldComponent",
  );
  // Can instantiate Slot to check constructor logic, but don't run() in this unit test.
  const slot = new Slot(config);
  assert(slot instanceof Slot, "Slot should be instantiated correctly");
});

// --- Integration Test: Slot + StandardController + HelloWorldComponent + Mock Agent ---

// Note: This test runs a live server and a mock client.
// It verifies the end-to-end flow using the standard network controller.
Deno.test("Integration: Slot runs HelloWorldComponent with Mock Agent", async () => {
  const testPort = 8099; // Use a specific port for testing to avoid conflicts
  const slotConfig: SlotConfig = {
    name: "TestIntegrationSlot",
    port: testPort,
    rootComponent: new HelloWorldComponent(), // Use the real component
  };
  const slot = new Slot(slotConfig);
  const agentUrl = `ws://localhost:${testPort}`;

  try {
    console.log("[Test] Starting Slot for integration test...");
    const listeningPromise = slot.run(); // Start the server

    // Wait for the server to confirm it's listening
    await listeningPromise;
    console.log("[Test] Slot is listening. Starting Mock Agent...");

    // Run the mock agent simulation
    const agentResult = await runMockAgentForTest(agentUrl);

    console.log("[Test] Mock Agent finished interaction.");
    assert(
      agentResult === true,
      "Mock Agent did not complete successfully or reported failure.",
    );
  } catch (e) {
    console.error("[Test] Integration test failed:", e);
    // Improve error reporting
    const errorMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    assert(false, `Integration test threw an error: ${errorMsg}`);
  } finally {
    console.log("[Test] Stopping Slot...");
    slot.stop(); // Ensure server is stopped regardless of test outcome
    console.log("[Test] Slot stopped.");
    // Add a small delay to help ensure the port is released before next test
    await delay(150);
  }
});
