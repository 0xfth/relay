# relay 🤖

A framework for agents

## Features

*   Simple `Convo` class to manage conversation history (user/model turns).
*   `GeminiModel` implementation for interacting with Google Gemini.
*   Supports basic text generation.
*   Supports requesting JSON output via schemas.
*   Type-safe interactions with Deno/TypeScript.

## Installation

This library is intended for use with Deno and can be imported directly from JSR.

```typescript
import { Convo, GeminiModel } from "jsr:@xfth/relay@^0.1.0";
```

## Usage

### Setup

1.  Make sure you have Deno installed.
2.  Create a `.env` file in your project root:
    ```.env
    GEMINI_API_KEY="your_actual_gemini_api_key"
    ```
3.  Ensure your script has environment variable access (`--allow-env`) and network access (`--allow-net`) when running.

### Basic Example

```typescript
import { Slot, SlotConfig, Component, Controller } from "jsr:@xfth/relay"; // Adjust version later
import { HelloWorldComponent } from "jsr:@xfth/relay/components/HelloWorldComponent"; // Example component

// Define the configuration for your Slot server
const config: SlotConfig = {
  name: "MyFirstSlot",
  port: 8080,
  rootComponent: new HelloWorldComponent(), // The component agents will interact with
};

// Create and run the Slot server
const slot = new Slot(config);
slot.run();

console.log(`Slot "${config.name}" running on ws://localhost:${config.port}`);
```

### Running an Agent

An Agent connects to the Slot via WebSocket and communicates using the defined [Relay Protocol](./PROTOCOL.md).

See `test-agent.ts` for a basic mock agent implementation. You can run it using:

```bash
deno task start-agent ws://localhost:8080
```

(Make sure the Slot server is running first: `deno task start-slot`)

## Core Concepts

*   **Slot:** A network server (WebSocket) that hosts Components and manages Agent connections.
*   **Component:** A unit of logic or task definition that interacts with an Agent via a Controller. Components define the *purpose* of the interaction (e.g., run a survey, process data, play a game turn).
*   **Controller:** An object passed to the Component that mediates communication with the connected Agent. It provides methods like `get()`, `pick()`, `confirm()`, `put()` which translate into network messages according to the Relay Protocol. Different Controller implementations can enforce different interaction policies (e.g., `StandardController`, `DebugController`).
*   **Agent:** An external process (which could be an LLM like Gemini, a human user via a CLI, or another automated system) that connects to a Slot and responds to Controller requests.
*   **Protocol:** The defined JSON message structure used for communication between the Controller (in the Slot) and the Agent over the WebSocket connection. ([PROTOCOL.md](./PROTOCOL.md))
*   **Convo:** Manages the conversation history within the Controller, tracking the interaction from the Component's perspective (Component prompts, Agent responses).

## API Overview (Work in Progress)

*   **`Slot(config: SlotConfig)`**: Creates a Slot server instance.
    *   `run()`: Starts the WebSocket server.
*   **`SlotConfig`**: Interface for Slot configuration (`name`, `port`, `rootComponent`, etc.).
*   **`Component`**: Interface (`name`, `interact(controller: Controller)`).
*   **`Controller`**: Abstract base class for interaction policies.
    *   `get<T>(query: string, schema?: object): Promise<T | null>`
    *   `pick<T>(query: string, options: Record<string, T>): Promise<T | null>`
    *   `confirm(query: string): Promise<boolean>`
    *   `put<T>(data: T): Promise<void>`
    *   `convo: Convo`
*   **`StandardController extends Controller`**: Concrete implementation using the standard Relay Protocol over WebSocket.
*   **`Convo`**: Manages conversation history.
    *   `constructor(systemPrompt?: string)`
    *   `user(content: string | object)`
    *   `model(content: string | object)`
    *   `message(role: string, content: any)`
    *   `clone()`
    *   `messages`: Array of `Message` objects.
    *   `system`: The system prompt string.
*   **`GeminiModel`**: (Now primarily relevant for *building Agents*, not directly used by the Slot/Controller).
    *   `gen<T>(convo: Convo, schema?: object): Promise<T>`


## License

This project is licensed under the CC0 1.0 Universal license.
