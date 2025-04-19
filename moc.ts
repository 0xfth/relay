import { type Component, type Controller, type Convo, Model } from "@/relay.ts";

export class MocModel extends Model {
  rigResponses: string[];
  constructor() {
    super();
    this.rigResponses = [];
  }
  rig(i: string) {
    this.rigResponses.push(i);
  }
  gen<T>(_c: Convo, s?: object): Promise<T> {
    const resp = this.rigResponses.pop() ?? "";
    if (s) {
      return new Promise((resolve) => resolve(JSON.parse(resp) as T));
    } else {
      return new Promise((resolve) => resolve(resp as T));
    }
  }
}

export class MocController implements Controller {
  rigResponses: string[];
  constructor() {
    this.rigResponses = [];
  }
  rig(i: string) {
    this.rigResponses.push(i);
  }
  popRig(): Promise<string | undefined> {
    return new Promise((resolve) => resolve(this.rigResponses.pop()));
  }
  put<T>(_i: T): boolean {
    return true;
  }
  async get<T>(i: string | object): Promise<T | null> {
    if (typeof i == "string") {
      const resp = await this.popRig();
      if (resp) {
        return resp as T;
      }
    } else {
      const resp = await this.popRig();
      if (resp) {
        return JSON.parse(resp) as T;
      }
    }
    return null;
  }
  async pick<T>(paths: Record<string, T>): Promise<T | null> {
    Object.keys(paths).forEach((p, i) => console.log(`${i}: ${p}`));
    const input = await this.popRig();
    if (!input) return null;
    const index = parseInt(input);
    if (!isNaN(index) && index >= 0 && index < Object.values(paths).length) {
      return Object.values(paths)[index];
    } else {
      return null;
    }
  }
  async confirm(_i: string): Promise<boolean> {
    return await this.popRig() == "true";
  }
}

export class MocLoggerComponent implements Component {
  log: string[];
  name: string;
  constructor() {
    this.log = [];
    this.name = "";
  }
  async interact(w: Controller): Promise<void> {
    this.log.push(await w.get("response") ?? "");
  }
}
