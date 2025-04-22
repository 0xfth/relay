import {
  Controller,
  Convo, // Import Convo value here
  type Message, // Keep type import if needed elsewhere
} from "@/relay.ts";
import { assert } from "jsr:@std/assert";

// Type definitions for Protocol v0.2
type RequestMessage = {
  id: string;
  content: unknown; // Flexible content
};

type ResponseMessage = {
  id: string; // Correlates to the request ID
  content?: unknown; // Agent's response content (flexible)
  error?: string; // Optional error message
};

/**
 * StandardController implements the Relay Protocol v0.2
 * for interacting with an external agent over a WebSocket connection.
 * It translates Component requests (`get`, `pick`, `confirm`, `put`)
 * into flexible protocol messages and handles responses, including
 * basic natural language parsing for confirm/pick.
 */
export class StandardController extends Controller {
  private ws: WebSocket;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: ResponseMessage) => void;
      reject: (reason?: any) => void;
    } // Resolve with the full response message
  >;
  private responseTimeoutMs: number = 30000; // 30 seconds timeout

  constructor(ws: WebSocket, initialConvo?: Convo) {
    super(initialConvo ?? new Convo("System: Relay Protocol v0.2 Connection"));
    this.ws = ws;
    this.pendingRequests = new Map();

    // --- WebSocket Event Listeners ---
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      this.rejectAllPending("WebSocket error");
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed.");
      this.rejectAllPending("WebSocket closed");
    };
  }

  private handleMessage(data: string | ArrayBuffer | Blob): void {
    if (typeof data !== "string") {
      console.warn("Received non-string WebSocket message, ignoring.");
      return;
    }

    try {
      const message = JSON.parse(data) as ResponseMessage;
      const requestId = message.id;

      if (!requestId || !this.pendingRequests.has(requestId)) {
        console.warn(
          `Received message with unknown, missing, or stale ID (${requestId}):`,
          message,
        );
        return;
      }

      const promiseFuncs = this.pendingRequests.get(requestId)!;
      this.pendingRequests.delete(requestId); // Remove from pending *before* resolving/rejecting

      if (message.error) {
        console.error(
          `Agent responded with error for request ${requestId}:`,
          message.error,
        );
        promiseFuncs.reject(new Error(`Agent error: ${message.error}`));
      } else {
        // Resolve with the entire response message object
        promiseFuncs.resolve(message);
      }
    } catch (error) {
      console.error("Failed to parse or handle WebSocket message:", error);
      console.error("Received data:", data);
      // Cannot correlate to a request if parsing fails. This connection might be broken.
      // Consider closing the connection or rejecting all pending requests.
      // this.rejectAllPending("Failed to parse incoming message");
    }
  }

  private rejectAllPending(reason: string): void {
    const error = new Error(reason);
    this.pendingRequests.forEach((promiseFuncs) => {
      promiseFuncs.reject(error);
    });
    this.pendingRequests.clear();
  }

  // --- Core Send Method ---

  /** Sends a request and returns the entire response message */
  protected sendRequest(payloadContent: unknown): Promise<ResponseMessage> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket is not open."));
      }

      const requestId = crypto.randomUUID();
      const message: RequestMessage = {
        id: requestId,
        content: payloadContent,
      };

      try {
        this.ws.send(JSON.stringify(message));
        this.pendingRequests.set(requestId, { resolve, reject });

        this.pendingRequests.get(requestId)!.resolve = (value) => {
          resolve(value);
        };
        this.pendingRequests.get(requestId)!.reject = (reason) => {
          reject(reason);
        };
      } catch (error) {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
        }
        reject(error);
      }
    });
  }

  override async get<T>(query: string, schema?: object): Promise<T | null> {
    this.convo.user(query);
    const requestContent: any = schema
      ? { instruction: query, output_schema: schema }
      : query;
    try {
      const response = await this.sendRequest(requestContent);
      if (response.content === undefined) {
        console.warn(
          `Controller.get received undefined content for query "${query}"`,
        );
        return null;
      }
      // Assume agent returns content in the expected type T (string or object matching schema)
      return this.convo.model(response.content as T);
    } catch (error) {
      console.error(`Controller.get failed for query "${query}":`, error);
      return null;
    }
  }

  override async pick<T>(
    query: string,
    options: Record<string, T>,
  ): Promise<T | null> {
    const optionKeys = Object.keys(options);
    const optionsText = optionKeys.map((key) => `[${key}]`).join(", "); // Simple text representation
    const fullQuery =
      `${query}\nPlease choose one of the following options: ${optionsText}`;
    this.convo.user(fullQuery); // Log the full prompt sent to the agent

    // Log options details separately for context (optional, could be verbose)
    // Object.entries(options).forEach(([key, value]) => {
    //     this.convo.message("system", `Option Detail "${key}": ${JSON.stringify(value)}`);
    // });

    try {
      const response = await this.sendRequest(fullQuery);
      const responseText = String(response.content).toLowerCase(); // Basic case-insensitive text parsing
      this.convo.model(responseText); // Log the raw response

      // Very basic parsing: find the first option key mentioned in the response
      for (const key of optionKeys) {
        // Search for the key, potentially surrounded by brackets or just the word
        const keyLower = key.toLowerCase();
        if (
          responseText.includes(`[${keyLower}]`) ||
          responseText.includes(keyLower)
        ) {
          console.log(`Controller.pick matched key: "${key}"`);
          return options[key];
        }
      }

      console.warn(
        `Controller.pick could not reliably determine choice from response: "${responseText}"`,
      );
      return null; // Could not parse a clear choice
    } catch (error) {
      console.error(`Controller.pick failed for query "${query}":`, error);
      return null;
    }
  }

  override async confirm(query: string): Promise<boolean> {
    const fullQuery =
      `${query}\nPlease respond with confirmation (e.g., 'yes', 'confirm', 'proceed') or rejection (e.g., 'no', 'cancel', 'stop').`;
    this.convo.user(fullQuery); // Log the full prompt

    try {
      const response = await this.sendRequest(fullQuery);
      const responseText = String(response.content).toLowerCase().trim();
      this.convo.model(responseText); // Log the raw response

      // Basic positive confirmation parsing
      const positiveIndicators = [
        "yes",
        "confirm",
        "ok",
        "okay",
        "proceed",
        "true",
        "affirmative",
      ];
      const confirmed = positiveIndicators.some((indicator) =>
        responseText.startsWith(indicator) || responseText.endsWith(indicator)
      ); // Check start/end

      return confirmed;
    } catch (error) {
      console.error(`Controller.confirm failed for query "${query}":`, error);
      return false; // Default to false on error
    }
  }
  override async put<T>(data: T): Promise<void> {
    const messageContent = typeof data === "string"
      ? data
      : JSON.stringify(data);
    const requestContent = { info: data }; // Wrap data in an object to signify it's informational
    // Await the sendRequest to ensure acknowledgement or error before returning
    try {
      const response = await this.sendRequest(requestContent);
      // Optional: Check response for expected acknowledgement status if needed
      const ackStatus = (response.content as any)?.status;
      if (response.error || (ackStatus && ackStatus !== "acknowledged")) {
        console.warn(
          `[StandardController.put] Agent acknowledgement issue for data ${
            JSON.stringify(data)
          }:`,
          response,
        );
        // Decide if this should throw an error or just warn
        // Depending on strictness, you might throw here:
        // throw new Error(`Agent did not acknowledge put correctly: ${response.error || JSON.stringify(response.content)}`);
      } else if (!response.error && !ackStatus) {
        // If no error but also no status field (unexpected response format)
        console.warn(
          `[StandardController.put] Received unexpected response format for ack for data ${
            JSON.stringify(data)
          }:`,
          response.content,
        );
        // throw new Error(`Unexpected acknowledgement format: ${JSON.stringify(response.content)}`);
      }
    } catch (error) {
      console.error(
        `[StandardController.put] Failed to send/receive ack for data ${
          JSON.stringify(data)
        }:`,
        error,
      );
      // Re-throw or handle the error appropriately
      throw error; // Propagate the error (e.g., timeout, connection closed)
    }
  }

  // Method to gracefully close the connection from the controller side
  close(): void {
    assert(
      this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING,
      `Cannot close WebSocket: ${JSON.stringify(this.ws)}`,
    );
    this.ws.close(1000, "Controller initiated close");
    this.rejectAllPending("Controller initiated close");
  }
}
