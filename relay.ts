export abstract class Model {
  abstract gen<T>(c: Convo, s?: object): Promise<T>;
}
export interface Component {
  name: string;
  interact(w: Controller): Promise<void>;
}
export abstract class Controller {
  abstract get<T>(i: string | object): Promise<T | null>;
  abstract pick<T>(paths: Record<string, T>): Promise<T | null>;
  abstract confirm(i: string): Promise<boolean>;
  abstract put<T>(i: T): void;
}
export class WorkerController extends Controller {
  convo: Convo;
  worker: Worker;
  constructor(w: Worker, c: Convo) {
    super();
    this.worker = w;
    this.convo = c;
  }
  async get<T>(i: string | object): Promise<T | null> {
    if (typeof i == "string") {
      this.convo.user(i);
      const resp = await this.convo.model(
        await this.worker.gen(this.convo),
      );
      if (resp) {
        return resp as T;
      }
    } else {
      const resp: T = this.convo.model(
        await this.worker.gen(this.convo, i),
      );
      return resp;
    }
    return null;
  }
  async pick<T>(paths: Record<string, T>): Promise<T | null> {
    Object.keys(paths).forEach((p, i) => this.convo.user(`${i}: ${p}`));
    const input: string = this.convo.model(
      await this.worker.gen(this.convo),
    );
    if (!input) return null;
    const index = parseInt(input);
    if (!isNaN(index) && index >= 0 && index < Object.values(paths).length) {
      return Object.values(paths)[index];
    } else {
      return null;
    }
  }
  async confirm(_i: string): Promise<boolean> {
    return this.convo.model(await this.worker.gen(this.convo)) == "true";
  }
  put<T>(i: T): void {
    this.convo.user(i);
  }
}
export class Worker {
  model: Model;
  constructor(m: Model) {
    this.model = m;
  }
  async gen<T>(c: Convo, s?: object): Promise<T> {
    if (s) return await this.model.gen(c, s);
    else return await this.model.gen(c);
  }
}
export interface Slot {
  name: string;
  instructions: string;
  worker: Worker | null;
  components: Component[];
}
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
  message<T>(role: string, content: T): T {
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
