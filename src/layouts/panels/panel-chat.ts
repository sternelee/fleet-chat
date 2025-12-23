import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { noSelectStyles, scrollableStyles } from '#/styles/global.css'
import '../../components/a2ui/a2ui-chat.js'

/**
 * Chat panel content component
 * Displays chat interface for communication
 */
@customElement('panel-chat')
export class PanelChat extends LitElement {
  connectedCallback() {
    super.connectedCallback()

    // Listen for search AI chat events
    window.addEventListener('search:ai-chat', this._handleSearchAIChat)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('search:ai-chat', this._handleSearchAIChat)
  }

  private _handleSearchAIChat = (event: Event) => {
    const customEvent = event as CustomEvent
    const { query } = customEvent.detail

    console.log('Received AI chat request from search:', query)

    // Trigger the chat with the query
    this._sendQueryToChat(query)
  }

  private _sendQueryToChat(query: string) {
    // Find the a2ui-chat component and trigger it
    const chatComponent = this.shadowRoot?.querySelector('a2ui-chat')
    if (chatComponent) {
      // Dispatch a custom event to the chat component
      chatComponent.dispatchEvent(
        new CustomEvent('external-message', {
          detail: { message: query },
        }),
      )
    }
  }

  render() {
    return html`
      <div class="chat-panel-container">
        <a2ui-chat></a2ui-chat>
      </div>
    `
  }

  static styles = [
    scrollableStyles,
    noSelectStyles,
    css`
      :host {
        display: block;
        height: 100%;
        width: 100%;
        overflow: hidden;
        box-sizing: border-box;
      }

      .chat-panel-container {
        height: 100%;
        width: 100%;
        display: flex;
        padding: 0;
        flex-direction: column;
        box-sizing: border-box;
        overflow: hidden;
      }

      /* Ensure a2ui-chat fills the container properly */
      a2ui-chat {
        height: 100%;
        width: 100%;
        display: block;
        overflow: hidden;
        box-sizing: border-box;
      }
    `,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-chat': PanelChat
  }
}
