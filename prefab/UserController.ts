import type { Controller } from "@/relay.ts";

function cliPrompt(i: string): Promise<string> {
  return new Promise((resolve) => {
    const resp = prompt(i);
    resolve(resp ?? "");
  });
}

export class UserController implements Controller {
  put<T>(i: T): boolean {
    console.log(i);
    return false;
  }
  async get<T>(i: string | object): Promise<T | null> {
    console.log(i);
    if (typeof i == "string") {
      const resp = await cliPrompt(i);
      if (resp) {
        return resp as T;
      }
    } else {
      const resp = await cliPrompt(JSON.stringify(i));
      if (resp) {
        return JSON.parse(resp) as T;
      }
    }
    return null;
  }
  async pick<T>(paths: Record<string, T>): Promise<T | null> {
    Object.keys(paths).forEach((p, i) => console.log(`${i}: ${p}`));
    const input = await cliPrompt("Select option by number:");
    if (!input) return null;
    const index = parseInt(input);
    if (!isNaN(index) && index >= 0 && index < Object.values(paths).length) {
      return Object.values(paths)[index];
    } else {
      return null;
    }
  }
  async confirm(i: string): Promise<boolean> {
    console.log(`Confirm (c) or Reject (r)?\n${i}`);
    return await cliPrompt(i) == "c";
  }
}
