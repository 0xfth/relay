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
import { Convo, GeminiModel } from "jsr:@xfth/relay@^0.1.0";

// This will automatically load the API key from .env
const model = new GeminiModel();

const c = new Convo("You are a helpful assistant.");
c.user("What is the capital of France?");

const response = c.model(await model.gen(c));

console.log(response); // Output: Paris
console.log(c.messages); // Shows the full conversation history
```

### JSON Output Example

```typescript
import { Convo, GeminiModel } from "jsr:@xfth/relay@^0.1.0";

const model = new GeminiModel();

const c = new Convo("Extract the city and country from the user query.");
c.user("I'm visiting Berlin in Germany next month.");

type Location = {
  city: string;
  country: string;
};

const locationSchema = {
  type: "object",
  properties: {
    city: { type: "string", description: "The name of the city mentioned." },
    country: { type: "string", description: "The name of the country mentioned." },
  },
  required: ["city", "country"],
};

const extractedData = c.model(
  await model.gen<Location>(c, locationSchema)
);

console.log(extractedData); // Output: { city: "Berlin", country: "Germany" }
```

## API Overview

*   **`Convo`**: Manages the conversation history.
    *   `constructor(systemPrompt?: string)`
    *   `user(content: string | object)`: Adds a user message.
    *   `model(content: string | object)`: Adds a model message.
    *   `clone()`: Creates a deep copy of the conversation.
    *   `messages`: Array of `Message` objects (`{ role: string, mime: string, content: string }`).
    *   `system`: The system prompt string.
*   **`GeminiModel`**: Implementation for Google Gemini.
    *   `constructor(baseModel?: string)`: Optionally specify a Gemini model name (defaults to "gemini-1.5-flash").
    *   `gen<T>(convo: Convo, schema?: object)`: Generates a response. If `schema` is provided, attempts to return parsed JSON matching the schema (`T`), otherwise returns a string (`T`).


## License

This project is licensed under the CC0 1.0 Universal license.
