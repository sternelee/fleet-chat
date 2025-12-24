import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { RigClient } from './rig-client.js'

// Event name constant for external message handling
const EXTERNAL_MESSAGE_EVENT = 'external-message'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

@customElement('rig-chat')
export class RigChat extends LitElement {
  @state()
  private requesting = false

  @state()
  private error: string | null = null

  @state()
  private messages: Message[] = []

  @state()
  private inputText = ''

  static styles = css`
    :host {
      display: block;
      max-width: 800px;
      margin: 0 auto;
      min-height: 100%;
      padding: 16px;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 16px;
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
      animation: fadeIn 0.5s ease-out;

      & h1 {
        margin: 0;
        color: #383b99;
        font-size: 28px;
        font-weight: 600;
      }

      & p {
        margin: 8px 0 0 0;
        color: #8487ea;
        font-size: 16px;
      }
    }

    .messages-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      padding: 8px;
      min-height: 200px;
    }

    .message {
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    }

    .user-message {
      background: #5154b3;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .assistant-message {
      background: #f1f1f1;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      white-space: pre-wrap;
    }

    .input-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f8f9ff;
      border-radius: 12px;
      border: 1px solid #c0c1ff;
    }

    .input-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .chat-input {
      flex: 1;
      min-height: 44px;
      max-height: 120px;
      padding: 12px 16px;
      border: 1px solid #8487ea;
      border-radius: 24px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.2s ease;

      &:focus {
        border-color: #5154b3;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .send-button {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      height: 44px;
      background: #5154b3;
      color: #ffffff;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 20px;

      &:not([disabled]):hover {
        background: #4447a6;
        transform: scale(1.05);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .error {
      color: #ba1a1a;
      background-color: #ffedea;
      border: 1px solid #ffdad6;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #8487ea;
      font-style: italic;
    }

    .loading::before {
      content: '';
      width: 16px;
      height: 16px;
      border: 2px solid #8487ea;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `

  #rigClient = new RigClient()

  connectedCallback() {
    super.connectedCallback()

    // Listen for external message events from the panel-chat
    this.addEventListener(EXTERNAL_MESSAGE_EVENT, this._handleExternalMessage)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener(EXTERNAL_MESSAGE_EVENT, this._handleExternalMessage)
  }

  private _handleExternalMessage = async (event: Event) => {
    const customEvent = event as CustomEvent
    const { message } = customEvent.detail

    if (message) {
      // Set the input text and submit
      this.inputText = message
      // Wait for the Lit update cycle to complete, then submit
      await this.updateComplete
      this._handleSubmit()
    }
  }

  render() {
    return html`
      <div class="chat-container">
        <div class="header">
          <h1>AI Chat Assistant</h1>
          <p>Powered by Rig - Multi-provider AI support</p>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="messages-area">
          ${this.messages.length === 0
            ? html`<div style="text-align: center; color: #8487ea; padding: 32px;">
                Start a conversation by typing a message below
              </div>`
            : repeat(
                this.messages,
                (msg) => msg.timestamp.getTime(),
                (msg) => html`
                  <div class="message ${msg.role}-message">${msg.content}</div>
                `,
              )}
          ${this.requesting ? html`<div class="loading">AI is thinking...</div>` : ''}
        </div>

        <div class="input-area">
          <div class="input-row">
            <textarea
              class="chat-input"
              placeholder="Type your message here..."
              .value=${this.inputText}
              @input=${(e: Event) => {
                const target = e.target as HTMLTextAreaElement
                this.inputText = target.value
                // Auto-resize textarea
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  this._handleSubmit()
                }
              }}
              ?disabled=${this.requesting}
              rows="1"
            ></textarea>
            <button
              class="send-button"
              type="button"
              ?disabled=${this.requesting || !this.inputText.trim()}
              @click=${this._handleSubmit}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    `
  }

  private _handleSubmit() {
    if (!this.inputText.trim() || this.requesting) return

    const userMessage: Message = {
      role: 'user',
      content: this.inputText.trim(),
      timestamp: new Date(),
    }

    this.messages = [...this.messages, userMessage]
    const messageContent = this.inputText.trim()
    this.inputText = ''

    this._sendMessage(messageContent)
  }

  private async _sendMessage(content: string) {
    try {
      this.requesting = true
      this.error = null

      const response = await this.#rigClient.send(content)

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }

      this.messages = [...this.messages, assistantMessage]
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred'
      console.error('Chat error:', err)
    } finally {
      this.requesting = false
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rig-chat': RigChat
  }
}
