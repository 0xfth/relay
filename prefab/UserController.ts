import type { Controller } from "@/relay.ts";
import { Convo } from "@/relay.ts"; // Import Convo implementation

function cliPrompt(i: string): Promise<string> {
  return new Promise((resolve) => {
    const resp = prompt(i);
    resolve(resp ?? "");
  });
}

export class UserController implements Controller {
  convo: Convo;
  constructor(initialConvo?: Convo) {
    this.convo = initialConvo ?? new Convo("UserController System Prompt");
  }

  async put<T>(data: T): Promise<void> {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    console.log("INFO:", message);
    this.convo.message("system", `PUT: ${message}`); // Log to convo
    // For CLI, just log and resolve
    return Promise.resolve();
  }
  async get<T>(query: string, schema?: object): Promise<T | null> {
    const promptMsg = schema
      ? `${query}\nSchema: ${JSON.stringify(schema)}`
      : query;
    console.log("PROMPT:", promptMsg); // Show prompt to user
    this.convo.user(query); // Log original query to convo

    const resp = await cliPrompt("> "); // Get user input

    if (!resp) return null;

    try {
      const result = schema ? JSON.parse(resp) as T : resp as T;
      return this.convo.model(result); // Log response and return
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      this.convo.model(`Error parsing response: ${resp}`);
      return null;
    }
  }
  async pick<T>(query: string, options: Record<string, T>): Promise<T | null> {
    console.log("PICK:", query);
    this.convo.user(query); // Log query
    const keys = Object.keys(options);
    keys.forEach((key, i) => {
      console.log(`  ${i}: ${key}`); // Show options numerically
      this.convo.message("system", `Option ${i}: ${key}`); // Log options to convo
    });
    const input = await cliPrompt("Select option by number: ");
    if (!input) return null;
    const index = parseInt(input);
    if (!isNaN(index) && index >= 0 && index < keys.length) {
      const chosenKey = keys[index];
      this.convo.model(`Selected: ${chosenKey}`); // Log choice
      return options[chosenKey];
    } else {
      console.log("Invalid selection.");
      this.convo.model(`Invalid selection: ${input}`);
      return null;
    }
  }
  async confirm(query: string): Promise<boolean> {
    console.log("CONFIRM:", query);
    this.convo.user(query); // Log query
    const resp = await cliPrompt("Confirm? (y/n): ");
    const confirmed = resp.toLowerCase().startsWith("y");
    this.convo.model(confirmed ? "Confirmed" : "Rejected"); // Log result
    return confirmed;
  }
}
