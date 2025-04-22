# Relay Agent Communication Protocol v0.2 (WebSocket/JSON)

This document defines a general-purpose JSON message structure for communication between a `Slot` (specifically, its `Controller` instance) and an external `Agent` over a WebSocket connection. The protocol emphasizes flexibility, allowing for natural language interaction, structured data exchange, or a mix thereof.

## Overview

Communication follows a request/response pattern initiated by the `Controller`.
- The `Controller` sends a `request` message to the `Agent`.
- The `Agent` processes the request and sends back a `response` message.
- Each `request` has a unique `id` (UUID v4 recommended) which **must** be included in the corresponding `response` message for correlation.

The `Controller` methods (`get`, `pick`, `confirm`, `put`) map the *intent* of the `Component` interaction onto these generic messages. This often involves crafting natural language prompts within the request `content`, but can also include structured data. The `Agent` is expected to interpret the request content and provide an appropriate response.

## Message Format

### Controller -> Agent: Request Message

Sent from the Controller to the Agent.

```json
{
  "id": "unique-request-uuid-1", // Unique identifier for this request
  "content": "What is your name?" // Can be a string (natural language)...
}
```

```json
{
  "id": "unique-request-uuid-2",
  "content": { // ...or a structured object
    "instruction": "Extract user details from the previous message.",
    "output_schema": { // Optional hint for desired response structure
      "type": "object",
      "properties": { "name": { "type": "string" }, "location": { "type": "string" } },
      "required": ["name"]
    }
  }
}
```

```json
{
  "id": "unique-request-uuid-3",
  "content": "Please choose one of the following actions: [Start Process], [View Details], [Cancel]"
  // Example showing how options for 'pick' might be embedded in text.
  // The Controller needs to parse the agent's natural language response.
}
```

```json
{
  "id": "unique-request-uuid-4",
  "content": { // Example for 'put' - sending info requires a response for confirmation
    "info": "User profile successfully updated.",
    "details": { "userId": 123, "timestamp": "2024-..." }
  }
  // The agent should simply send a response confirming receipt.
}
```

### Agent -> Controller: Response Message

Sent from the Agent back to the Controller in response to a specific request.

```json
{
  "id": "unique-request-uuid-1", // MUST match the ID of the request being responded to
  "content": "You can call me HAL." // Agent's response (string)...
}
```

```json
{
  "id": "unique-request-uuid-2", // Matches the request ID
  "content": { // ...or structured object
    "name": "Dave Bowman",
    "location": "Jupiter Orbit"
  }
}
```

```json
{
  "id": "unique-request-uuid-3", // Matches the request ID
  "content": "I choose [Start Process]."
  // Agent response to the choice prompt. Controller parses this.
}
```

```json
{
  "id": "unique-request-uuid-4", // Matches the request ID
  "content": { "status": "acknowledged" }
  // Simple acknowledgement for an informational request.
}
```

```json
{
    "id": "unique-request-uuid-5", // Matches the request ID
    "error": "Could not process the request: Invalid data format."
    // Optional error field if the agent failed. 'content' might be null/omitted.
}
```

## Key Principles

- **Flexibility:** The `content` field in both request and response can be a simple string or a complex JSON object.
- **Correlation:** The `id` field is crucial for matching responses to requests.
- **Intent Mapping:** The `Controller` translates component actions (`get`, `pick`, `confirm`, `put`) into appropriate `request` messages. For example:
    - `get()` might send a question as string content.
    - `get(..., schema)` might send an instruction object including the schema.
    - `pick()` might send a message listing options textually.
    - `confirm()` might send a yes/no question.
    - `put()` might send an informational object.
- **Agent Interpretation:** The Agent is responsible for understanding the `request.content` and formulating a helpful `response.content`.
- **Controller Parsing:** The `Controller` must parse the `response.content` to extract the needed information (text, structured data, choice confirmation) for the `Component`.

## Error Handling

- Agents should include an `error` field in the `response` message if they cannot fulfill a request.
- Controllers should handle timeouts waiting for responses and network errors gracefully, likely propagating an error back to the `Component`.