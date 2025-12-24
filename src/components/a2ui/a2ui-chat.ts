import { SignalWatcher } from '@lit-labs/signals'
import { css, html, LitElement, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { A2UIClient } from './client.js'
import './a2ui-renderer.js'

// Event name constant for external message handling
const EXTERNAL_MESSAGE_EVENT = 'external-message'

// Mock A2UI types for now
interface ServerToClientMessage {
  type: string
  data?: any
  a2ui_message?: any
}

interface A2UIClientEventMessage {
  userAction: {
    surfaceId: string
    name: string
    sourceComponentId: string
    timestamp: string
    context: Record<string, any>
  }
}

@customElement('a2ui-chat')
export class A2UIChat extends SignalWatcher(LitElement) {
  @state()
  private requesting = false

  @state()
  private error: string | null = null

  @state()
  private lastMessages: ServerToClientMessage[] = []

  @state()
  private a2uiMessages: any[] = []

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

    .input-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f8f9ff;
      border-radius: 12px;
      border: 1px solid #c0c1ff;
      animation: fadeIn 1s cubic-bezier(0, 0, 0.3, 1) 1s backwards;
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

      &:not([disabled]):hover {
        background: #4447a6;
        transform: scale(1.05);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      & .material-symbols-outlined {
        font-size: 20px;
      }
    }

    .pending {
      width: 100%;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 1s cubic-bezier(0, 0, 0.3, 1) 0.3s backwards;
      gap: 8px;

      & .material-symbols-outlined {
        margin-right: 8px;
        animation: rotate 1s linear infinite;
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

    .header {
      text-align: center;
      margin-bottom: 24px;
      animation: fadeIn 1s cubic-bezier(0, 0, 0.3, 1) 0.3s backwards;

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

    .a2ui-area {
      margin: 16px 0;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e1e5e9;
    }

    .message-area {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 200px;
    }

    .message {
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
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

    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    /* Load Material Symbols font */
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
  `

  #a2uiClient = new A2UIClient()

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
      this.#handleSubmit()
    }
  }

  render() {
    return html`
      <div class="chat-container">
        <div class="header">
          <h1>AI Chat Assistant</h1>
          <p>Ask me anything! I'll help you find information and complete tasks.</p>
        </div>

        ${this.#maybeRenderError()}
        ${this.#maybeRenderForm()}
        ${this.#maybeRenderA2UI()}
        ${this.#maybeRenderData()}
      </div>
    `
  }

  #maybeRenderError() {
    if (!this.error) return nothing

    return html`<div class="error">${this.error}</div>`
  }

  #maybeRenderForm() {
    if (this.requesting && this.lastMessages.length === 0) return nothing

    return html`
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
                this.#handleSubmit()
              }
            }}
            ?disabled=${this.requesting}
            rows="1"
          ></textarea>
          <button
            class="send-button"
            type="button"
            ?disabled=${this.requesting || !this.inputText.trim()}
            @click=${this.#handleSubmit}
          >
            <span class="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    `
  }

  #maybeRenderA2UI() {
    if (this.a2uiMessages.length === 0) return nothing

    return html`
      <div class="a2ui-area">
        <a2ui-renderer 
          .messages=${this.a2uiMessages}
          @a2ui-action=${this.#handleA2UIAction}
        ></a2ui-renderer>
      </div>
    `
  }

  #handleA2UIAction(event: CustomEvent) {
    console.log('A2UI Action received:', event.detail)

    // Handle A2UI actions by sending them back to the agent
    const action = event.detail
    const message: A2UIClientEventMessage = {
      userAction: {
        surfaceId: 'a2ui-surface',
        name: action.name,
        sourceComponentId: 'a2ui-component',
        timestamp: new Date().toISOString(),
        context: {
          actionContext: action.context,
        },
      },
    }

    this.#sendAndProcessMessage(message)
  }

  #maybeRenderData() {
    if (this.requesting && this.lastMessages.length === 0) {
      return html`
        <div class="pending">
          <span class="material-symbols-outlined">progress_activity</span>
          <span>Thinking...</span>
        </div>
      `
    }

    if (this.lastMessages.length === 0) {
      return nothing
    }

    return html`
      <div class="message-area">
        ${repeat(
          this.lastMessages,
          (_message, index) => index,
          (message, _index) => {
            if (message.type === 'user_message') {
              return html`<div class="message user-message">${(message as any).data}</div>`
            } else {
              return html`<div class="message assistant-message">${(message as any).data}</div>`
            }
          },
        )}
      </div>
    `
  }

  #handleSubmit() {
    if (!this.inputText.trim() || this.requesting) return

    const userMessage: ServerToClientMessage = {
      type: 'user_message',
      data: this.inputText.trim(),
    }

    this.lastMessages = [...this.lastMessages, userMessage]

    const message: A2UIClientEventMessage = {
      userAction: {
        surfaceId: 'chat-input',
        name: 'send_message',
        sourceComponentId: 'chat-input',
        timestamp: new Date().toISOString(),
        context: {
          message: this.inputText.trim(),
        },
      },
    }

    this.#sendAndProcessMessage(message)
    this.inputText = ''
  }

  async #sendAndProcessMessage(request: A2UIClientEventMessage) {
    try {
      this.requesting = true
      this.error = null

      const messages = await this.#sendMessage(request)

      // Separate regular messages from A2UI messages
      const regularMessages: ServerToClientMessage[] = []
      const a2uiMessages: any[] = []

      messages.forEach((msg) => {
        if (msg.a2ui_message) {
          a2uiMessages.push(msg.a2ui_message)
        } else {
          regularMessages.push(msg)
        }
      })

      this.lastMessages = [...this.lastMessages, ...regularMessages]
      this.a2uiMessages = a2uiMessages
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred'
      console.error('Chat error:', err)
    } finally {
      this.requesting = false
    }
  }

  async #sendMessage(message: A2UIClientEventMessage): Promise<ServerToClientMessage[]> {
    const response = await this.#a2uiClient.send(message)

    // Convert A2UI messages to display format
    return response.map((msg: any) => {
      // If it has content, display the content directly
      if (msg.content) {
        return {
          type: 'assistant_message',
          data: msg.content,
        }
      }

      // Otherwise, show the full response as JSON
      return {
        type: 'assistant_message',
        data: JSON.stringify(msg, null, 2),
      }
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'a2ui-chat': A2UIChat
  }
}
