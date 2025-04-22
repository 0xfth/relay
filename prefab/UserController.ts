import type { Controller } from "@/relay.ts";
import { Convo } from "@/relay.ts";

function cliPrompt(i: string): Promise<string> {
  return new Promise((resolve) => {
    const resp = prompt(i);
    resolve(resp ?? "");
  });
}

/**
 * Controller implementation that uses the command line (prompt)
 * for interaction. Useful for testing components locally.
 */
export class UserController implements Controller {
  convo: Convo;
  constructor(initialConvo?: Convo) {
    this.convo = initialConvo ?? new Convo("UserController Active");
  }

  async put<T>(data: T): Promise<void> {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    console.log("[INFO]", message); // Use console.log for user visibility
    this.convo.message("system", `PUT: ${message}`);
    return Promise.resolve();
  }

  async get<T>(query: string, schema?: object): Promise<T | null> {
    const promptMsg = schema ? `${query}\n(Schema: ${JSON.stringify(schema)})` : query;
    this.convo.user(query);
    const resp = await cliPrompt(`[GET] ${promptMsg}\n> `);
    if (!resp) return null;
    try {
      const result = schema ? JSON.parse(resp) as T : resp as T;
      return this.convo.model(result);
    } catch (e) {
      console.error("! Failed to parse response as JSON:", e);
      this.convo.model(`Error parsing response: ${resp}`);
      return null;
    }
  }

  async pick<T>(query: string, options: Record<string, T>): Promise<T | null> {
    this.convo.user(query);
    const keys = Object.keys(options);
    let promptMsg = `[PICK] ${query}\nOptions:\n`;
    keys.forEach((key, i) => {
        promptMsg += `  ${i}: ${key}\n`;
        this.convo.message("system", `Option ${i}: ${key}`);
    });
    const input = await cliPrompt(promptMsg + "Select option by number: ");
    if (!input) return null;
    const index = parseInt(input);
    if (!isNaN(index) && index >= 0 && index < keys.length) {
      const chosenKey = keys[index];
      this.convo.model(`Selected: ${chosenKey}`);
      return options[chosenKey];
    } else {
      console.log("! Invalid selection.");
      this.convo.model(`Invalid selection: ${input}`);
      return null;
    }
  }

  async confirm(query: string): Promise<boolean> {
    this.convo.user(query);
    const resp = await cliPrompt(`[CONFIRM] ${query} (y/n): `);
    const confirmed = resp.toLowerCase().startsWith("y");
    this.convo.model(confirmed ? "Confirmed" : "Rejected");
    return confirmed;
  }
}
