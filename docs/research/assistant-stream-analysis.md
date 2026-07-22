# Research: Mastra Agent SSE Stream Integration & UI Rendering Analysis

This document details the analysis of the real-time Server-Sent Events (SSE) chat streaming connection for the Pabriq Business Assistant. It identifies the root cause of the silent UI update failure and details the required client-side stream hook and UI rendering fixes.

---

## 1. Client-Server SSE Communication Flow

### Context & Requirements
The Pabriq Business Assistant uses Server-Sent Events (SSE) to stream real-time responses and tool execution statuses from the server.
- **Protocol**: HTTP `POST` requests to `/api/assistant/stream`.
- **Response Headers**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no` (disables buffering on Nginx/Vercel proxies)

### Stream Chunk Parsing
*Source: `src/features/assistant/hooks/use-assistant-stream.ts`*

The client reads the stream body using a `ReadableStreamDefaultReader` in a `while (true)` loop:
1. Decoding Uint8Array bytes into UTF-8 text strings using `TextDecoder`.
2. Splitting the buffer by double newline characters (`\n\n`) to partition SSE frames.
3. Parsing frames prefixed with `data: ` into structured JSON events (`StreamEvent`).

---

## 2. Stream Event Flow & ID Transition Bug

### The Event Lifecycle
The server pushes the following JSON event types sequentially:
- `ready`: Broadcasts the server-assigned persistent message ID (`assistantMessageId`).
- `text-delta`: Delivers incremental text updates (`delta`).
- `tool-call`: Notifies that a Mastra tool is starting execution (`toolName`, `toolCallId`).
- `tool-result`: Sends the tool execution result or status summary (`summary`, `isError`).
- `metadata`: Contains metadata payloads (e.g. order draft proposals).
- `finish`: Signals completion of the response stream.
- `error`: Transmits exception messages.

### Root Cause of UI Freeze: Message ID Mismatch
*Source: `src/features/assistant/hooks/use-assistant-stream.ts` and `src/routes/api/assistant/stream.ts`*

1. **Temporary ID Generation**: In the client-side `sendMessage` handler, a temporary message with a client-generated UUID is appended to the local chat state:
   ```typescript
   const assistantMsg: StreamMessage = {
     id: crypto.randomUUID(), // e.g. "client-temp-uuid"
     role: "assistant",
     text: "",
     toolCalls: [],
     isRunning: true,
   };
   ```
2. **Server-Side Persistent ID**: The server generates a persistent message ID (`assistantMessageId`) via `crypto.randomUUID()` and returns it in the `ready` event.
3. **Reference Update**: In `useAssistantStream`, the ready event handler transitions the internal tracking reference (`aRef.id`) to the server ID:
   ```typescript
   case "ready":
     aRef.id = event.assistantMessageId; // Now references server-assigned ID
     break;
   ```
4. **State Lookup Failure**: Subsequent stream chunks (such as `text-delta` or `tool-call` events) update the state using `setMsg(prev, aRef.id, ...)`:
   ```typescript
   case "text-delta":
     aRef.text += event.delta;
     setMessages((prev) =>
       setMsg(prev, aRef.id, (m) => ({ ...m, text: aRef.text })), // Uses server-assigned ID
     );
     break;
   ```
   **The Bug**: The actual message in the React `messages` state still has the original client-generated UUID (`"client-temp-uuid"`). Because `setMsg` searches by `event.assistantMessageId`, it cannot find the message (`idx === -1`).
   **The Consequence**: The state update is silently ignored. The message remains empty in the UI.

---

## 3. UI Rendering & DotMatrix Loader Logic

### Conditional Bypass in Chat View
*Source: `src/features/assistant/components/floating-assistant-v2.tsx`*

The assistant chat bubbles are rendered via the `AssistantMessageView` component:
```typescript
{/* Text */}
{msg.text && (
  <div className="max-w-[92%] border bg-background px-3 py-2.5 text-foreground text-sm/relaxed">
    <StreamingMarkdown text={msg.text} isRunning={partIsRunning} />
    {partIsRunning && <DotMatrix state="loading" />}
  </div>
)}
```
**The Bug**: The entire bubble container and the `<DotMatrix>` component are guarded by `{msg.text && ...}`.
- When the assistant is thinking (executing tools or waiting for the first token delta), `msg.text` is `""`.
- Because `msg.text` is empty, no bubble container is rendered.
- If there are no tool calls yet, the assistant side only renders the header label `"Assistant 12:05"` without any indication of life.

### Solution Design
1. **Container Visibility**: The bubble container must be rendered if `msg.text` is populated OR if `partIsRunning` is active.
2. **Dynamic Indicator State**: While active, if `msg.text` is empty, the container should show a `<DotMatrix>` in the `"thinking"` or `"searching"` state to signal activity.
3. **Transition to Text**: Once text starts arriving, `StreamingMarkdown` will render, and `<DotMatrix state="loading" />` will show inline.

---

## 4. Recommended Implementation Fix

### A. Update message ID in `messages` state on `ready`
Update `use-assistant-stream.ts` to swap the message ID in React state when receiving the `ready` event:
```typescript
case "ready": {
  const oldId = aRef.id;
  aRef.id = event.assistantMessageId;
  setMessages((prev) =>
    setMsg(prev, oldId, (m) => ({ ...m, id: event.assistantMessageId })),
  );
  break;
}
```

### B. Render bubble container during active thinking
Update `floating-assistant-v2.tsx` to display the container when the stream is active, regardless of text length:
```typescript
{/* Text or active streaming state */}
{(msg.text || partIsRunning) && (
  <div className="max-w-[92%] border bg-background px-3 py-2.5 text-foreground text-sm/relaxed">
    {msg.text ? (
      <StreamingMarkdown text={msg.text} isRunning={partIsRunning} />
    ) : (
      <span className="sr-only">Thinking...</span>
    )}
    {partIsRunning && (
      <DotMatrix
        state={msg.toolCalls.some(tc => tc.status === 'running') ? 'searching' : 'thinking'}
        className="mt-1 block"
      />
    )}
  </div>
)}
```

---

## Citations & Sources

*   **Assistant Stream Hook**: `src/features/assistant/hooks/use-assistant-stream.ts` (manages message state and SSE parsing).
*   **Assistant SSE Route**: `src/routes/api/assistant/stream.ts` (Mastra orchestration and event formatting).
*   **Assistant View Components**: `src/features/assistant/components/floating-assistant-v2.tsx` (renders bubbles, headers, and composer).
*   **Status Indicator**: `src/components/assistant-ui/dot-matrix.tsx` (defines dot-matrix visual states and animations).
