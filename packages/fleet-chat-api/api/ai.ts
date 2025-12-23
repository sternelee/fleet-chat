/**
 * AI API
 *
 * Provides AI functionality for plugins via Rig agent backend
 * Requests are proxied through Tauri backend via tauri_axum.ts
 */

export interface AIOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface AIStreamOptions extends AIOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (response: AIResponse) => void;
  onError?: (error: Error) => void;
}

export class AI {
  private static defaultOptions: Partial<AIOptions> = {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  };

  static async generate(options: AIOptions): Promise<AIResponse> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const response = await fetch(`/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedOptions),
      });
      if (!response.ok) {
        throw new Error(`AI generate failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      throw error;
    }
  }

  static async generateStream(options: AIStreamOptions): Promise<void> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const response = await fetch(`/ai/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedOptions),
      });

      if (!response.ok) {
        throw new Error(`AI generate stream failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Response body is null");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "done") {
              options.onComplete?.({
                text: "",
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              });
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text && options.onChunk) {
                options.onChunk(parsed.text);
              }
              if (parsed.error && options.onError) {
                options.onError(new Error(parsed.error));
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate AI stream:", error);
      if (options.onError) {
        options.onError(error as Error);
      }
    }
  }

  static async chat(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<AIOptions>,
  ): Promise<AIResponse> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const response = await fetch(`/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, options: mergedOptions }),
      });
      if (!response.ok) {
        throw new Error(`AI chat failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to generate AI chat response:", error);
      throw error;
    }
  }

  static async embed(text: string, model?: string): Promise<number[]> {
    try {
      const response = await fetch(`/ai/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model }),
      });
      if (!response.ok) {
        throw new Error(`AI embed failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }

  static async moderate(content: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }> {
    try {
      const response = await fetch(`/ai/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error(`AI moderate failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to moderate content:", error);
      throw error;
    }
  }

  // Image generation
  static async generateImage(
    prompt: string,
    options?: {
      size?: "256x256" | "512x512" | "1024x1024";
      quality?: "standard" | "hd";
      n?: number;
    },
  ): Promise<string[]> {
    try {
      const response = await fetch(`/ai/generate_image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...options }),
      });
      if (!response.ok) {
        throw new Error(`AI generate image failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.urls;
    } catch (error) {
      console.error("Failed to generate images:", error);
      throw error;
    }
  }

  // Image analysis
  static async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`/ai/analyze_image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, prompt }),
      });
      if (!response.ok) {
        throw new Error(`AI analyze image failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.analysis;
    } catch (error) {
      console.error("Failed to analyze image:", error);
      throw error;
    }
  }

  // Token counting
  static async countTokens(text: string, model?: string): Promise<number> {
    try {
      const response = await fetch(`/ai/count_tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model }),
      });
      if (!response.ok) {
        throw new Error(`AI count tokens failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.count;
    } catch (error) {
      console.error("Failed to count tokens:", error);
      throw error;
    }
  }

  // Model information
  static async getModels(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      contextLength: number;
    }>
  > {
    try {
      const response = await fetch(`/ai/models`);
      if (!response.ok) {
        throw new Error(`AI get models failed: ${response.statusText}`);
      }
      const result = await response.json();
      return result.models;
    } catch (error) {
      console.error("Failed to get AI models:", error);
      return [];
    }
  }

  // AI client factory
  static createClient(config: { apiKey?: string; baseURL?: string; model?: string }) {
    return new AIClient(config);
  }
}

export class AIClient {
  private config: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  };

  constructor(config: { apiKey?: string; baseURL?: string; model?: string }) {
    this.config = config;
  }

  async generate(options: AIOptions): Promise<AIResponse> {
    const mergedOptions = { ...this.config, ...options };
    return AI.generate(mergedOptions);
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<AIOptions>,
  ): Promise<AIResponse> {
    const mergedOptions = { ...this.config, ...options };
    return AI.chat(messages, mergedOptions);
  }

  async embed(text: string): Promise<number[]> {
    return AI.embed(text, this.config.model);
  }
}
