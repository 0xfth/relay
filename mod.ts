// Core abstractions
export {
  type Component,
  Controller, // Now abstract base class for network controllers
  Convo,
  type Message,
  Model, // Still relevant for the Agent side, or testing Models directly
  type SlotConfig
} from "@/relay.ts";

// Concrete implementations & Prefabs
export { StandardController } from "@/prefab/StandardController.ts";
export { GeminiModel } from "@/prefab/GeminiModel.ts"; // Useful for building agents
export { UserController } from "@/prefab/UserController.ts"; // Useful for CLI-based agents/testing

// Slot runner
export { Slot } from "@/slot.ts";

// Example Components (optional export, depends on library structure)
export { HelloWorldComponent } from "@/components/HelloWorldComponent.ts";
