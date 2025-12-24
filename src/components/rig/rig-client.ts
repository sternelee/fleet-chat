/**
 * Rig AI Client
 * 
 * Client for interacting with the Rig AI agent backend
 * Uses the /ai/* endpoints powered by rig-core library
 */

export interface RigChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface RigChatOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
}

export interface RigChatResponse {
  text: string
  model?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  finish_reason?: string
}

export class RigClient {
  #ready: Promise<void> = Promise.resolve()
  #conversationHistory: RigChatMessage[] = []

  get ready() {
    return this.#ready
  }

  /**
   * Send a message to the Rig AI agent
   * @param message - The user message to send
   * @param options - Optional chat configuration
   * @returns The AI response
   */
  async send(message: string, options?: RigChatOptions): Promise<string> {
    // Add user message to history
    this.#conversationHistory.push({
      role: 'user',
      content: message,
    })

    const response = await fetch('/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: this.#conversationHistory,
        options: options || null,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result: RigChatResponse = await response.json()

    // Add assistant response to history
    this.#conversationHistory.push({
      role: 'assistant',
      content: result.text,
    })

    return result.text
  }

  /**
   * Clear the conversation history
   */
  clearHistory() {
    this.#conversationHistory = []
  }

  /**
   * Get the current conversation history
   */
  getHistory(): RigChatMessage[] {
    return [...this.#conversationHistory]
  }

  /**
   * Set the conversation history (useful for restoring sessions)
   */
  setHistory(history: RigChatMessage[]) {
    this.#conversationHistory = [...history]
  }
}
