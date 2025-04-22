// --- Core Abstractions ---

export abstract class Model {
  abstract gen<T>(c: Convo, s?: object): Promise<T>;
}

export interface Component {
  name: string;
  interact(controller: Controller): Promise<void>;
}

/**
 * Abstract interface for mediating Component interactions with an Agent.
 * Manages conversation history.
 */
export abstract class Controller {
  convo: Convo;

  constructor(initialConvo?: Convo) {
    this.convo = initialConvo ?? new Convo();
  }

  abstract get<T>(query: string, schema?: object): Promise<T | null>;
  abstract pick<T>(
    query: string,
    options: Record<string, T>,
  ): Promise<T | null>;
  abstract confirm(query: string): Promise<boolean>;
  abstract put<T>(data: T): Promise<void>;
}

export interface SlotConfig {
  name: string;
  port: number;
  rootComponent: Component;
  // Future enhancements: auth, policies, validation component etc.
}

// --- Conversation Management ---
export type Message = {
  role: string;
  mime: string;
  content: string; // Content is always stored as string (JSON stringified if object)
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

  // Adds a message to the history, converting content to string if necessary.
  // Returns the original content for chaining.
  message<T>(role: string, content: T): T {
    let mime: string;
    let contentStr: string;

    if (typeof content === "string") {
      mime = "text/plain";
      contentStr = content;
    } else {
      mime = "application/json";
      try {
        contentStr = JSON.stringify(content);
      } catch (e) {
        console.warn("Failed to stringify message content:", e);
        contentStr = "[Unserializable Content]";
      }
    }

    this.messages.push({ role, mime, content: contentStr });
    return content;
  }

  clone(): Convo {
    const nc = new Convo(this.system);
    // Shallow copy message objects, which is fine as they are immutable records
    nc.messages = this.messages.map((m) => ({ ...m }));
    return nc;
  }
}
