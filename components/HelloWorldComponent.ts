import { Component, Controller } from "@/relay.ts";

export class HelloWorldComponent implements Component {
  name = "HelloWorldComponent";

  async interact(controller: Controller): Promise<void> {
    console.log(`[${this.name}] Starting interaction.`);

    await controller.put("Hello from Component!");
    console.log(`[${this.name}] Sent greeting.`);

    const name = await controller.get<string>("What is your name?");

    if (name) {
      console.log(`[${this.name}] Received name: ${name}`);
      await controller.put(`Nice to meet you, ${name}!`);
      console.log(`[${this.name}] Sent follow-up message.`);
    } else {
      console.log(`[${this.name}] Did not receive a name.`);
      await controller.put("Sorry, I didn't get your name.");
    }

     const choice = await controller.pick("Pick a color:", {
        red: "#FF0000",
        green: "#00FF00",
        blue: "#0000FF",
     });
     console.log(`[${this.name}] Picked color value: ${choice}`);
     await controller.put(`You picked ${choice}`);


     const proceed = await controller.confirm("Shall we finish?");
     console.log(`[${this.name}] Confirmation result: ${proceed}`);
     if(proceed) {
        await controller.put("Okay, finishing interaction.");
     } else {
        await controller.put("Okay, we won't finish yet (but this component will anyway).");
     }


    console.log(`[${this.name}] Interaction finished.`);
  }
}