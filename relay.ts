export abstract class Model {
  abstract gen<T>(c: Convo, s?: object): Promise<T>;
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