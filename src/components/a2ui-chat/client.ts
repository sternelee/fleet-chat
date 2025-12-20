export class A2UIClient {
  #ready: Promise<void> = Promise.resolve();
  get ready() {
    return this.#ready;
  }

  async send(message: any): Promise<any[]> {
    const response = await fetch("/a2ui/agent/chat/stream", {
      body: JSON.stringify({
        session_id: "default",
        content: message.userAction?.context?.message || "",
        use_ui: true,
        tool_context: {}
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Handle Server-Sent Events stream
    const messages: any[] = [];
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body available");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              console.log("Received SSE event:", parsed);
              
              // Handle A2UI messages
              if (parsed.type === 'a2ui_message' && parsed.a2ui_message) {
                messages.push(parsed.a2ui_message);
              }
              // Handle content messages (regular text responses)
              else if (parsed.type === 'content_message' && parsed.content) {
                messages.push({ content: parsed.content });
              }
              // Handle error events
              else if (parsed.type === 'error') {
                console.error("Agent error:", parsed.message);
                messages.push({ content: `Error: ${parsed.message}` });
              }
              // Other events (processing, completed) are just logged
              else {
                console.log("Received other event type:", parsed.type);
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return messages;
  }
}
