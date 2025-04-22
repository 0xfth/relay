// --- Core Abstractions ---

export abstract class Model {
  abstract gen<T>(c: Convo, s?: object): Promise<T>;
}

export interface Component {
  name: string;
  interact(w: Controller): Promise<void>;
}

/**
 * Abstract class defining the interface for mediating Component interactions
 * with an External Agent over a network. Concrete implementations handle the
 * specific protocol and network communication (e.g., WebSockets).
 * It manages the conversation history from the Component's perspective.
 */
export abstract class Controller {
  convo: Convo;

  constructor(initialConvo?: Convo) {
    this.convo = initialConvo ?? new Convo();
  }

  // Concrete implementations will handle sending/receiving messages according to their protocol.

  /** Get input from the agent, optionally matching a schema. */
  abstract get<T>(query: string, schema?: object): Promise<T | null>;

  /** Ask the agent to pick one option from a map. Returns the *value* associated with the chosen key. */
  abstract pick<T>(
    query: string,
    options: Record<string, T>,
  ): Promise<T | null>;

  /** Ask the agent for a boolean confirmation. */
  abstract confirm(query: string): Promise<boolean>;

  /** Send information to the agent. Should resolve when the information is successfully sent/acknowledged. */
  abstract put<T>(data: T): Promise<void>;
}

// Slot definition needs rethinking for networked architecture.
// This is just a placeholder. Phase 1.4 will implement a functional Slot.
export interface SlotConfig {
  name: string;
  port: number; // Port for the WebSocket server
  // systemPrompt?: string; // Initial system prompt for the Convo
  rootComponent: Component; // The entry point component
  // allowedControllerPolicies?: string[]; // See Phase 2.4
  // authMechanism?: any; // See Phase 3.1
  // validationComponent?: Component; // See Phase 3.2
}

// --- Conversation Management ---
export type Message = {
  role: string;
  mime: string;
  content: string;
};
export class Convo {
  system: string;
  messages: Message[];
  constructor(sys?: string) {
    this.system = sys ?? "";
    this.messages = [];
  }
  user<T>(content: T): T {
    return this.message("user", content);
  }
  model<T>(content: T): T {
    return this.message("model", content);
  }
  private message<T>(role: string, content: T): T {
    if (typeof content == "string") {
      this.messages.push({
        role,
        mime: "plain/text",
        content: content as string,
      });
    } else {
      this.messages.push({
        role,
        mime: "application/json",
        content: JSON.stringify(content),
      });
    }
    return content;
  }
  clone(): Convo {
    const nc = new Convo();
    nc.system = this.system;
    nc.messages = this.messages.map((m) => ({ ...m }));
    return nc;
  }
}
