/**
 * AI API
 *
 * Provides AI functionality for plugins
 */

import { invoke } from "@tauri-apps/api/core";

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
      const response = await invoke<AIResponse>("ai_generate", { options: mergedOptions });
      return response;
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      throw error;
    }
  }

  static async generateStream(options: AIStreamOptions): Promise<void> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      await invoke("ai_generate_stream", {
        options: mergedOptions,
        onChunk: options.onChunk,
        onComplete: options.onComplete,
        onError: options.onError,
      });
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
      const response = await invoke<AIResponse>("ai_chat", { messages, options: mergedOptions });
      return response;
    } catch (error) {
      console.error("Failed to generate AI chat response:", error);
      throw error;
    }
  }

  static async embed(text: string, model?: string): Promise<number[]> {
    try {
      const embedding = await invoke<number[]>("ai_embed", { text, model });
      return embedding;
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
      const result = await invoke("ai_moderate", { content }) as {
        flagged: boolean;
        categories: Record<string, boolean>;
        categoryScores: Record<string, number>;
      };
      return result;
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
      const images = await invoke<string[]>("ai_generate_image", {
        prompt,
        options: options || {},
      });
      return images;
    } catch (error) {
      console.error("Failed to generate images:", error);
      throw error;
    }
  }

  // Image analysis
  static async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    try {
      const analysis = await invoke<string>("ai_analyze_image", { imageUrl, prompt });
      return analysis;
    } catch (error) {
      console.error("Failed to analyze image:", error);
      throw error;
    }
  }

  // Token counting
  static async countTokens(text: string, model?: string): Promise<number> {
    try {
      const count = await invoke<number>("ai_count_tokens", { text, model });
      return count;
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
      const models = await invoke<
        Array<{
          id: string;
          name: string;
          description: string;
          contextLength: number;
        }>
      >("ai_get_models");
      return models;
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

