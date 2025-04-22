
import { StandardController } from "@/prefab/StandardController.ts";
import { type Component, Convo, type SlotConfig } from "@/relay.ts"; // Convo is imported here

/**
 * Represents a running Slot server that listens for Agent connections
 * via WebSockets and facilitates interaction with a configured Component
 * using a Controller policy.
 */
export class Slot {
  config: SlotConfig;
  private serverAbortController: AbortController | null = null;
  private listeningPromise: Promise<void> | null = null;
  private listeningResolve: (() => void) | null = null;

  constructor(config: SlotConfig) {
    this.config = config;
    console.log(`[Slot "${config.name}"] Configured for port ${config.port}`);
  }

  /**
   * Starts the WebSocket server and listens for incoming agent connections.
   * @param signal Optional AbortSignal to shut down the server externally.
   * @returns A Promise that resolves when the server starts listening.
   */
  run(signal?: AbortSignal): Promise<void> {
     if (this.serverAbortController) {
        console.warn(`[Slot "${this.config.name}"] Server already running or starting.`);
        return this.listeningPromise ?? Promise.resolve();
     }

    this.serverAbortController = new AbortController();
    const internalSignal = this.serverAbortController.signal;

    // Combine external signal with internal one if provided
    signal?.addEventListener("abort", () => this.stop(), { once: true });

    // Create a promise that resolves when onListen is called
    this.listeningPromise = new Promise<void>((resolve) => {
        this.listeningResolve = resolve;
    });


    console.log(`[Slot "${this.config.name}"] Starting server on port ${this.config.port}...`);

    // Use the built-in Deno.serve
     Deno.serve({
        port: this.config.port,
        signal: internalSignal, // Use combined signal
        onListen: () => {
            console.log(`[Slot "${this.config.name}"] Server listening on port ${this.config.port}.`);
            if (this.listeningResolve) {
                this.listeningResolve();
                this.listeningResolve = null; // Reset resolver
            }
        },
        onError: (error) => {
            console.error(`[Slot "${this.config.name}"] Server error:`, error);
            return new Response("Server error", { status: 500 });
        },
     // Pass the arrow function property directly (this is bound correctly)
     }, this.handleHttpRequest);

    return this.listeningPromise;
  }

  /** Stops the running Slot server. */
  stop(): void {
      if (this.serverAbortController && !this.serverAbortController.signal.aborted) {
          console.log(`[Slot "${this.config.name}"] Stopping server...`);
          this.serverAbortController.abort();
          this.serverAbortController = null;
          this.listeningPromise = null; // Reset promise state
          this.listeningResolve = null;
      } else {
           console.log(`[Slot "${this.config.name}"] Server not running or already stopping.`);
      }
      }

      /** Handles incoming HTTP requests, upgrading to WebSocket if necessary. */
      private handleHttpRequest = (req: Request): Response => {
        // Upgrade HTTP request to WebSocket
        if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req);
            this.handleWebSocketConnection(socket);
            return response; // Return the response to complete the handshake
    } else {
      // Handle regular HTTP requests (e.g., health check, info)
      return new Response(
        `Slot "${this.config.name}" is active. Use WebSocket to connect.`,)
        }
      }


  private handleWebSocketConnection(ws: WebSocket): void {
    console.log(`Slot "${this.config.name}": Agent connected.`);

    // 1. Instantiate Controller (currently hardcoded to StandardController)
    // TODO: Implement policy selection (Phase 2.4)
    const initialConvo = new Convo(`System: You are connected to Slot "${this.config.name}".`);
    const controller = new StandardController(ws, initialConvo);

    // 2. Instantiate the root Component
    // TODO: Error handling if component instantiation fails
    const component = this.config.rootComponent;
     console.log(`Slot "${this.config.name}": Starting component "${component.name}"...`);


     // WebSocket event handlers defined within handleWebSocketConnection


     ws.onopen = () => {
       console.log(`[Slot "${this.config.name}"] WebSocket connection opened by agent.`);
       // 3. Run the component's interaction logic *after* the connection is open
       // Run async, don't await here so Slot can handle other events if needed
       (async () => {
           try {
               console.log(`Slot "${this.config.name}": Starting component "${component.name}"...`);
               // TODO: Implement validation component hook (Phase 3.2)
               // Optionally send a welcome message?
               // await controller.put(`Welcome to Slot "${this.config.name}"! Starting component "${component.name}"...`);

               await component.interact(controller);
               console.log(`Slot "${this.config.name}": Component "${component.name}" finished interaction.`);
           } catch (error) {
               console.error(
                   `Slot "${this.config.name}": Error during component "${component.name}" interaction:`,
                    error,
               );
               // Attempt to notify agent of the error before closing (best effort)
                if (ws.readyState === WebSocket.OPEN) {
                   try {
                     const errorMessage = error instanceof Error ? error.message : String(error);
                     await controller.put({ error: `Component interaction failed: ${errorMessage}` });
                   } catch (putError) {
                      console.error("Failed to send component error message to agent:", putError);
                   }
                }
           } finally {
                console.log(`Slot "${this.config.name}": Interaction cycle complete.`);
                // Close the connection from the server side if the component finishes,
                // unless the component logic itself dictates otherwise (e.g., long-running interaction).
                // Check state before closing, as agent might have already closed.
                if (ws.readyState === WebSocket.OPEN) {
                    console.log(`Slot "${this.config.name}": Closing WebSocket after component completion.`);
                    controller.close(); // Use controller's close method
                }
           }
       })();
     };

     // Error and close events are handled by the StandardController's internal listeners,
     // but we add logging here from the Slot's perspective too.

     // Logging disconnects from the slot's perspective
      ws.onclose = (event) => {
        console.log(`Slot "${this.config.name}": Agent disconnected (code: ${event.code}, reason: ${event.reason})`);
      };
      ws.onerror = (event) => {
         console.error(`Slot "${this.config.name}": WebSocket error occurred:`, event instanceof ErrorEvent ? event.message : event.type);
      }

  }
}
