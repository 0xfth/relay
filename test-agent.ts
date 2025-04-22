#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

// Basic Mock Agent Client for Relay Protocol v0.2

const SLOT_URL = Deno.args[0] || "ws://localhost:8080"; // Default or take from arg

console.log(`Agent: Attempting to connect to Slot at: ${SLOT_URL}`);

const ws = new WebSocket(SLOT_URL);

ws.onopen = () => {
  console.log("Agent: Connected to Slot.");
};

ws.onmessage = (event) => {
  try {
    const request = JSON.parse(event.data); // Now expecting { id, content }
    console.log("Agent: Received request:", JSON.stringify(request, null, 2));

    const id = request.id;
    if (!id) {
      console.error("Agent: Received message without ID, ignoring.");
      return;
    }

    let responseContent: unknown = null; // Default response content
    let error: string | undefined = undefined; // Default no error

    const requestContent = request.content;

    // --- Simple Mock Logic based on Request Content ---
    if (typeof requestContent === 'string') {
      const queryLower = requestContent.toLowerCase();
      if (queryLower.includes("what is your name")) {
        responseContent = "My name is MockAgent v0.2";
      } else if (queryLower.includes("choose one") && queryLower.includes("options:")) {
         // Basic choice handling - find first bracketed option and echo it
         const match = queryLower.match(/\[([^\]]+)\]/); // Find first [option]
         if (match) {
            responseContent = `Okay, I choose [${match[1]}]`;
            console.log(`Agent: Responding to choice with: ${responseContent}`);
         } else {
            responseContent = "I couldn't decide from the options.";
            console.warn("Agent: Could not parse options from choice request:", queryLower);
         }
      } else if (queryLower.includes("respond with confirmation") || queryLower.includes("yes/no")) {
         // Basic confirm handling
         responseContent = "Yes, confirmed.";
         console.log("Agent: Auto-confirming request.");
      } else {
         // Default echo for other string requests
         responseContent = `Agent received: "${requestContent}"`;
      }
    } else if (typeof requestContent === 'object' && requestContent !== null) {
       if ('instruction' in requestContent && requestContent.instruction.toLowerCase().includes("extract user details")) {
           console.log("Agent: Handling structured request for user details.");
           responseContent = { name: "Mock User", location: "Test Location" };
           // Check if schema was provided (optional)
           if('output_schema' in requestContent) {
             console.log("Agent: Schema provided, attempting to match (basic mock).")
             // Simple mock: Assume schema asks for name/location and return them.
             // A real agent would use the schema properly.
              responseContent = {
                 name: "Mock User (Schema)",
                 location: "Test Location (Schema)"
              };
           }
       } else if ('info' in requestContent) {
           console.log("Agent: Received informational message, acknowledging.");
           // For 'put'/info messages, just acknowledge receipt
           responseContent = { status: "acknowledged", received: requestContent.info };
       }
       else {
           console.log("Agent: Received generic object, acknowledging.");
           responseContent = { status: "received object", keys: Object.keys(requestContent) };
       }
    } else {
       console.warn("Agent: Received request with unexpected content type:", typeof requestContent);
       error = "Unsupported request content type";
    }

    // --- Prepare and Send Response ---
    const response: { id: string, content?: unknown, error?: string } = { id };
    if (error) {
      response.error = error;
      console.error(`Agent: Sending error response for ${id}: ${error}`);
    } else {
      response.content = responseContent;
      console.log(`Agent: Sending response for ${id}:`, JSON.stringify(response.content));
    }

    ws.send(JSON.stringify(response));

  } catch (err) {
    console.error("Agent: Failed to process message or internal error:", err);
    console.error("Agent: Raw data received:", event.data);
    // Attempt to send an error response if possible (might fail if ID is missing/invalid)
     try {
        const potentialId = JSON.parse(event.data)?.id;
        if (potentialId) {
           ws.send(JSON.stringify({ id: potentialId, error: `Agent failed to process message: ${err.message}` }));
        }
     } catch { /* Ignore if sending error fails */ }
  }
};

ws.onerror = (event) => {
  console.error("Agent: WebSocket error:", event instanceof ErrorEvent ? event.message : event.type);
};

ws.onclose = (event) => {
  console.log(`Agent: Connection closed (code: ${event.code}, reason: ${event.reason})`);
  // Deno should exit automatically when the WebSocket closes.
};