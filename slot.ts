
import { StandardController } from "@/prefab/StandardController.ts";
import { type Component, Convo, type SlotConfig } from "@/relay.ts";

/**
 * Runs a WebSocket server that connects Agents to Components via Controllers.
 */
export class Slot {
  config: SlotConfig;
  private serverAbortController: AbortController | null = null;
  private listeningPromise: Promise<void> | null = null;
  private listeningResolve: (() => void) | null = null;

  constructor(config: SlotConfig) {
    this.config = config;
  }

  /** Starts the WebSocket server. */
  run(signal?: AbortSignal): Promise<void> {
     if (this.serverAbortController) {
        console.warn(`[Slot "${this.config.name}"] Server already running.`);
        return this.listeningPromise ?? Promise.resolve();
     }

    this.serverAbortController = new AbortController();
    const internalSignal = this.serverAbortController.signal;
    signal?.addEventListener("abort", () => this.stop(), { once: true });

    this.listeningPromise = new Promise<void>((resolve) => {
        this.listeningResolve = resolve;
    });

    console.log(`[Slot "${this.config.name}"] Starting on port ${this.config.port}...`);

     Deno.serve({
        port: this.config.port,
        signal: internalSignal,
        onListen: () => {
            console.log(`[Slot "${this.config.name}"] Listening on ws://localhost:${this.config.port}`);
            this.listeningResolve?.();
            this.listeningResolve = null;
        },
        onError: (error) => {
            console.error(`[Slot "${this.config.name}"] Server error:`, error);
            return new Response("Server error", { status: 500 });
        },
     }, this.handleHttpRequest);

    return this.listeningPromise;
  }

  /** Stops the running Slot server. */
  stop(): void {
      if (this.serverAbortController && !this.serverAbortController.signal.aborted) {
          console.log(`[Slot "${this.config.name}"] Stopping...`);
          this.serverAbortController.abort();
          this.serverAbortController = null;
          this.listeningPromise = null;
          this.listeningResolve = null;
      }
  }

  /** Handles incoming HTTP requests, upgrading to WebSocket if applicable. */
  private handleHttpRequest = (req: Request): Response => {
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      // Detach the handling to avoid blocking the serve loop
      this.handleWebSocketConnection(socket)
          .catch(err => console.error(`[Slot "${this.config.name}"] Error handling WebSocket connection:`, err));
      return response;
    } else {
      return new Response(`Slot "${this.config.name}" active. Use WebSocket.`, { status: 200 });
    }
  }

  /** Manages a single WebSocket connection and runs the component interaction. */
  private async handleWebSocketConnection(ws: WebSocket): Promise<void> {
    console.log(`[Slot "${this.config.name}"] Agent connected.`);
    const controller = new StandardController(ws, new Convo(`System: Slot "${this.config.name}"`));
    const component = this.config.rootComponent; // TODO: Handle component creation errors

    try {
      // Wait for the connection to be fully open before starting interaction
      await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("WebSocket open timeout")), 5000); // 5s timeout
          ws.onopen = () => { clearTimeout(timeout); resolve(); };
          ws.onerror = (ev) => { clearTimeout(timeout); reject(ev instanceof ErrorEvent ? ev.error : new Error("WebSocket error during open")); };
          // onclose might also fire if connection fails immediately
          ws.onclose = () => { clearTimeout(timeout); reject(new Error("WebSocket closed before opening")); };
          // Handle case where ws is already open when handler is attached
          if (ws.readyState === WebSocket.OPEN) {
              clearTimeout(timeout);
              resolve();
          }
      });

      console.log(`[Slot "${this.config.name}"] Running component: ${component.name}`);
      await component.interact(controller);
      console.log(`[Slot "${this.config.name}"] Component ${component.name} finished.`);

    } catch (error) {
      console.error(`[Slot "${this.config.name}"] Interaction error with component "${component.name}":`, error);
      // Don't try to send error via controller if the error might be the connection itself
    } finally {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`[Slot "${this.config.name}"] Closing connection after interaction.`);
        controller.close(); // Use controller's close method
      } else {
        console.log(`[Slot "${this.config.name}"] Connection already closed.`);
      }
    }
     // No need for explicit onclose/onerror logging here, as they are primarily
     // handled within the StandardController for request/response correlation.
     // The try/catch/finally handles the overall interaction lifecycle.
  }
}
