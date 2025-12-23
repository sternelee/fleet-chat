import { css, html, LitElement, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { repeat } from 'lit/directives/repeat.js'

export enum SnackType {
  NONE = 'NONE',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export type SnackTypeType = 'NONE' | 'PENDING' | 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO'

export type SnackbarAction = {
  title: string
  action: string
  value: any
  callback?: () => void
}

export type SnackbarMessage = {
  id: string
  message: string
  type?: SnackTypeType
  persistent?: boolean
  actions?: SnackbarAction[]
}

export type SnackbarUUID = string

export class SnackbarActionEvent extends Event {
  constructor(type: string, value?: any, callback?: () => void) {
    super(type)
    this.value = value
    this.callback = callback
  }

  value?: any
  callback?: () => void
}

const DEFAULT_TIMEOUT = 8000

@customElement('a2ui-snackbar')
export class Snackbar extends LitElement {
  @property({ reflect: true, type: Boolean })
  accessor active = false

  @property({ reflect: true, type: Boolean })
  accessor error = false

  @property()
  accessor timeout = DEFAULT_TIMEOUT

  #messages: SnackbarMessage[] = []
  #timeout: number | NodeJS.Timeout = 0

  static styles = css`
    :host {
      --text-color: #333333;
      --background: #ffffff;
      --error-bg: #dc3545;
      --error-color: #ffffff;
      --border-radius: 8px;
      --shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-size: 14px;
      --line-height: 1.4;
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;

      display: flex;
      align-items: center;
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      pointer-events: none;
      background: var(--background);
      padding: var(--spacing-md) var(--spacing-lg);
      width: 90vw;
      max-width: 720px;
      z-index: 1800;
      overflow-x: auto;
      font: 400 var(--font-size) / var(--line-height) var(--font-family);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      transition: opacity 0.3s cubic-bezier(0, 0, 0.3, 1) 0.2s;
      scrollbar-width: none;
    }

    :host([active]) {
      opacity: 1;
      pointer-events: auto;
    }

    :host([error]) {
      background: var(--error-bg);
      --text-color: var(--error-color);
    }

    .icon {
      flex: 0 0 auto;
      color: var(--text-color);
      margin-right: var(--spacing-md);
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &.rotate {
        animation: rotate 1s linear infinite;
      }
    }

    #messages {
      color: var(--text-color);
      flex: 1 1 auto;
      margin-right: var(--spacing-lg);
      word-wrap: break-word;

      a,
      a:visited {
        color: var(--a2ui-primary);
        text-decoration: none;

        &:hover {
          color: var(--a2ui-primary-variant);
          text-decoration: underline;
        }
      }
    }

    #actions {
      flex: 0 1 auto;
      width: fit-content;
      margin-right: var(--spacing-md);

      & button {
        font: 500 var(--font-size) / var(--line-height) var(--font-family);
        padding: 0;
        background: transparent;
        border: none;
        margin: 0 var(--spacing-md);
        color: var(--text-color);
        opacity: 0.7;
        transition: opacity 0.2s cubic-bezier(0, 0, 0.3, 1);
        cursor: pointer;

        &:not([disabled]):hover,
        &:focus {
          opacity: 1;
        }
      }
    }

    #close {
      display: flex;
      align-items: center;
      padding: 0;
      color: var(--text-color);
      background: transparent;
      border: none;
      margin: 0 0 0 var(--spacing-sm);
      opacity: 0.7;
      transition: opacity 0.2s cubic-bezier(0, 0, 0.3, 1);
      cursor: pointer;
      width: 20px;
      height: 20px;

      &:not([disabled]):hover,
      &:focus {
        opacity: 1;
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

    /* Material Icons fallback */
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

  show(message: SnackbarMessage, replaceAll = false): SnackbarUUID {
    const existingMessage = this.#messages.findIndex((msg) => msg.id === message.id)
    if (existingMessage === -1) {
      if (replaceAll) {
        this.#messages.length = 0
      }

      this.#messages.push(message)
    } else {
      this.#messages[existingMessage] = message
    }

    clearTimeout(this.#timeout)
    if (!this.#messages.every((msg) => msg.persistent)) {
      this.#timeout = setTimeout(() => {
        this.hide()
      }, this.timeout)
    }

    this.error = this.#messages.some((msg) => msg.type === SnackType.ERROR)
    this.active = true
    this.requestUpdate()

    return message.id
  }

  hide(id?: SnackbarUUID) {
    if (id) {
      const idx = this.#messages.findIndex((msg) => msg.id === id)
      if (idx !== -1) {
        this.#messages.splice(idx, 1)
      }
    } else {
      this.#messages.length = 0
    }

    this.active = this.#messages.length !== 0
    this.updateComplete.then((avoidedUpdate) => {
      if (!avoidedUpdate) {
        return
      }
      this.requestUpdate()
    })
  }

  render() {
    let rotate = false
    let icon = ''

    // Find the most significant message to display icon
    for (let i = this.#messages.length - 1; i >= 0; i--) {
      const msg = this.#messages[i]
      if (msg.type === SnackType.PENDING) {
        icon = 'progress_activity'
        rotate = true
        break
      } else if (msg.type === SnackType.ERROR) {
        icon = 'error'
        break
      } else if (msg.type === SnackType.SUCCESS) {
        icon = 'check_circle'
        break
      } else if (msg.type === SnackType.WARNING) {
        icon = 'warning'
        break
      } else if (msg.type === SnackType.INFO) {
        icon = 'info'
        break
      }
    }

    return html`
      ${
        icon
          ? html`<span
            class=${classMap({
              icon: true,
              'material-symbols-outlined': true,
              rotate,
            })}
            >${icon}</span
          >`
          : nothing
      }
      <div id="messages">
        ${repeat(
          this.#messages,
          (message) => message.id,
          (message) => html`<div>${message.message}</div>`,
        )}
      </div>
      <div id="actions">
        ${repeat(
          this.#messages,
          (message) => message.id,
          (message) => {
            if (!message.actions || message.actions.length === 0) {
              return nothing
            }

            return html`${repeat(
              message.actions,
              (action) => action.value,
              (action) => html`<button
                  @click=${() => {
                    this.hide()
                    this.dispatchEvent(
                      new SnackbarActionEvent(action.action, action.value, action.callback),
                    )
                  }}
                >
                  ${action.title}
                </button>`,
            )}`
          },
        )}
      </div>
      <button
        id="close"
        @click=${() => {
          this.hide()
          this.dispatchEvent(new SnackbarActionEvent('dismiss'))
        }}
      >
        <span class="material-symbols-outlined">close</span>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'a2ui-snackbar': Snackbar
  }
}
