#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

// Basic Mock Agent Client for Relay Protocol v0.2

const SLOT_URL = Deno.args[0] || "ws://localhost:8080";

console.log(`Agent: Connecting to ${SLOT_URL}`);

const ws = new WebSocket(SLOT_URL);

ws.onopen = () => {
  console.log("Agent: Connected.");
};

ws.onmessage = (event) => {
  try {
    const request = JSON.parse(event.data);
    // console.log("Agent RX:", JSON.stringify(request)); // Uncomment for debugging

    const id = request.id;
    if (!id) {
      console.error("Agent: Received message without ID.");
      return;
    }

    let responseContent: unknown = null;
    let error: string | undefined = undefined;
    const requestContent = request.content;

    // --- Simple Mock Logic ---
    if (typeof requestContent === 'string') {
      const queryLower = requestContent.toLowerCase();
      if (queryLower.includes("what is your name")) {
        responseContent = "MockAgent";
      } else if (queryLower.includes("pick a color")) {
        responseContent = "[green]"; // Respond minimally for pick
      } else if (queryLower.includes("(confirm yes/no)")) {
        responseContent = "yes"; // Respond minimally for confirm
      } else {
        // Default acknowledgement for other strings
        responseContent = `Ack: ${requestContent}`;
      }
    } else if (typeof requestContent === 'object' && requestContent !== null) {
       if ('info' in requestContent) {
           // Acknowledge 'put' messages
           responseContent = { status: "acknowledged" };
       } else if ('instruction' in requestContent && 'output_schema' in requestContent) {
            // Handle simple schema request (example)
            responseContent = { mock_data: "value based on schema" };
       }
       else {
           // Generic object acknowledgement
           responseContent = { status: "received object" };
       }
    } else {
       error = "Unsupported request content type";
    }

    // --- Send Response ---
    const response: { id: string, content?: unknown, error?: string } = { id };
    if (error) {
      response.error = error;
    } else {
      response.content = responseContent;
    }
    // console.log(`Agent TX (${id}):`, JSON.stringify(response.content ?? response.error)); // Uncomment for debugging
    ws.send(JSON.stringify(response));

  } catch (err) {
    console.error("Agent: Error processing message:", err);
    // Don't attempt complex error reporting back over potentially broken socket
  }
};

ws.onerror = (event) => {
  console.error("Agent: WebSocket error:", event instanceof ErrorEvent ? event.message : event.type);
};

ws.onclose = (event) => {
  console.log(`Agent: Connection closed (Code: ${event.code}, Reason: "${event.reason}")`);
};