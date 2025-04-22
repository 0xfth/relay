#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { Slot } from "@/slot.ts";
import { HelloWorldComponent } from "@/components/HelloWorldComponent.ts";
import { SlotConfig } from "@/relay.ts";

const config: SlotConfig = {
  name: "HelloWorld Slot",
  port: 8080,
  rootComponent: new HelloWorldComponent(),
};

const slot = new Slot(config);

slot.run(); // Starts the server

// Deno.serve keeps the process alive. Add signal handling if needed.