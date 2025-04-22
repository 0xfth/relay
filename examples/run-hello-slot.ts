#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { Slot } from "@/slot.ts";
import { HelloWorldComponent } from "@/components/HelloWorldComponent.ts";
import { SlotConfig } from "@/relay.ts";

const config: SlotConfig = {
  name: "HelloWorld Slot",
  port: 8080, // Default port
  rootComponent: new HelloWorldComponent(),
};

const slot = new Slot(config);

slot.run(); // Starts the server, does not block execution here

console.log(`Slot server setup complete for "${config.name}". Listening on port ${config.port}. Press Ctrl+C to stop.`);

// Keep the process running (Deno.serve handles this implicitly)
// You might add signal handlers here for graceful shutdown if needed.