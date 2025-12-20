export class A2UIClient {
  #ready: Promise<void> = Promise.resolve();
  get ready() {
    return this.#ready;
  }

  async send(message: any): Promise<any[]> {
    const response = await fetch("/a2ui/agent/chat", {
      body: JSON.stringify({
        session_id: "default",
        content: message.userAction?.context?.message || "",
        use_ui: true,
        tool_context: {}
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error: string };
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Check if this is a streaming response
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("text/event-stream")) {
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
                if (parsed.type === 'a2ui_message' && parsed.a2ui_message) {
                  messages.push(parsed.a2ui_message);
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
    } else {
      // Handle regular JSON response
      const jsonResponse = await response.json();
      console.log("Received JSON response:", jsonResponse);
      return [jsonResponse];
    }
  }
}
