import { Component, Controller } from "@/relay.ts";

export class HelloWorldComponent implements Component {
  name = "HelloWorldComponent";

  async interact(controller: Controller): Promise<void> {
    await controller.put("Hello from Component!");

    const name = await controller.get<string>("What is your name?");

    if (name) {
      await controller.put(`Nice to meet you, ${name}!`);
    } else {
      await controller.put("Sorry, I didn't get your name.");
    }

     const choice = await controller.pick("Pick a color:", {
        red: "#FF0000",
        green: "#00FF00",
        blue: "#0000FF",
     });
     // Assuming choice cannot be null for this simple component's logic
     await controller.put(`You picked ${choice}`);


     const proceed = await controller.confirm("Shall we finish?");
     if(proceed) {
        await controller.put("Okay, finishing interaction.");
     } else {
        // The component finishes regardless in this example
        await controller.put("Okay, finishing interaction anyway.");
     }
  }
}