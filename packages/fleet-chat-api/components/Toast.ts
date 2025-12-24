/**
 * Fleet Chat Toast Component
 *
 * Raycast-compatible Toast notification component built with Lit
 */

import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export type ToastStyle = 'success' | 'failure' | 'info' | 'warning'

export interface ToastProps {
  style?: ToastStyle
  title: string
  message?: string
  primaryAction?: {
    title: string
    onAction: () => void
  }
  secondaryAction?: {
    title: string
    onAction: () => void
  }
}

/**
 * Toast manager for handling multiple toasts
 */
class ToastManager {
  private static instance: ToastManager
  private containers: Map<string, HTMLElement> = new Map()
  private toasts: Map<string, HTMLElement[]> = new Map()

  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager()
    }
    return ToastManager.instance
  }

  registerContainer(rootId: string, container: HTMLElement) {
    this.containers.set(rootId, container)
    this.toasts.set(rootId, [])
  }

  showToast(rootId: string, props: ToastProps, duration: number = 3000) {
    const container = this.containers.get(rootId)
    if (!container) {
      console.warn(`No toast container found for root: ${rootId}`)
      return
    }

    // Create toast element
    const toast = document.createElement('fc-toast') as FCToast
    Object.assign(toast, props)
    container.appendChild(toast)

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible')
    })

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(toast)
      }, duration)
    }

    return toast
  }

  dismissToast(toast: HTMLElement) {
    toast.classList.remove('visible')
    toast.classList.add('hiding')
    setTimeout(() => {
      toast.remove()
    }, 300)
  }

  clearAll(rootId?: string) {
    if (rootId) {
      const container = this.containers.get(rootId)
      if (container) {
        container.innerHTML = ''
      }
    } else {
      this.containers.forEach((container) => {
        container.innerHTML = ''
      })
    }
  }
}

/**
 * showToast function - main API for showing toasts
 */
export function showToast(
  props: ToastProps | string,
  options?: { duration?: number; rootId?: string },
): void {
  const manager = ToastManager.getInstance()

  let toastProps: ToastProps

  if (typeof props === 'string') {
    toastProps = {
      title: props,
      style: 'info',
    }
  } else {
    toastProps = props
  }

  const rootId = options?.rootId || 'default'
  manager.showToast(rootId, toastProps, options?.duration)
}

/**
 * showActionSheet function - for showing actionable toasts
 */
export function showActionSheet(props: {
  title: string
  message?: string
  actions: Array<{
    title: string
    style?: ToastStyle
    onAction: () => void
  }>
}): void {
  // Convert to multiple toasts or create a special action sheet toast
  props.actions.forEach((action, index) => {
    setTimeout(() => {
      showToast({
        title: action.title,
        message: props.message,
        style: action.style || 'info',
        primaryAction: {
          title: 'OK',
          onAction: action.onAction,
        },
      })
    }, index * 100)
  })
}

/**
 * Alert function - for showing simple alerts
 */
export async function alert(message: string): Promise<void> {
  return new Promise((resolve) => {
    showToast(
      {
        title: 'Alert',
        message: message,
        style: 'info',
        primaryAction: {
          title: 'OK',
          onAction: () => resolve(),
        },
      },
      { duration: 0 },
    )
  })
}

/**
 * Confirm function - for showing confirmation dialogs
 */
export async function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    showToast(
      {
        title: 'Confirm',
        message: message,
        style: 'info',
        primaryAction: {
          title: 'OK',
          onAction: () => resolve(true),
        },
        secondaryAction: {
          title: 'Cancel',
          onAction: () => resolve(false),
        },
      },
      { duration: 0 },
    )
  })
}

@customElement('fc-toast')
export class FCToast extends LitElement {
  @property({ type: String })
  style?: ToastStyle = 'info'

  @property({ type: String })
  title!: string

  @property({ type: String })
  message?: string

  @property({ type: Object })
  primaryAction?: {
    title: string
    onAction: () => void
  }

  @property({ type: Object })
  secondaryAction?: {
    title: string
    onAction: () => void
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      z-index: 10000;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: var(--color-background, #1c1c1e);
      border: 1px solid var(--color-border, #38383a);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 280px;
      max-width: 400px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    .toast.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .toast.hiding {
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.2s ease-out;
    }

    /* Style variants */
    .toast.success {
      border-left: 3px solid #34c759;
    }

    .toast.failure {
      border-left: 3px solid #ff3b30;
    }

    .toast.info {
      border-left: 3px solid #007aff;
    }

    .toast.warning {
      border-left: 3px solid #ff9500;
    }

    .toast-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .toast.success .toast-icon {
      color: #34c759;
    }

    .toast.failure .toast-icon {
      color: #ff3b30;
    }

    .toast.info .toast-icon {
      color: #007aff;
    }

    .toast.warning .toast-icon {
      color: #ff9500;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-text-primary, #ffffff);
      margin-bottom: 2px;
    }

    .toast-message {
      font-size: 13px;
      color: var(--color-text-secondary, #8e8e93);
      line-height: 1.4;
    }

    .toast-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .toast-action {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      background: var(--color-secondary, #2c2c2e);
      color: var(--color-text-primary, #ffffff);
    }

    .toast-action:hover {
      background: var(--color-item-hover, #3a3a3c);
    }

    .toast-action.primary {
      background: var(--color-primary, #0a84ff);
      color: #ffffff;
    }

    .toast-action.primary:hover {
      background: #409cff;
    }

    .toast-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #8e8e93);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: opacity 0.15s ease;
      padding: 0;
    }

    .toast-close:hover {
      opacity: 1;
    }
  `

  private _getIcon(): string {
    const icons = {
      success: '✓',
      failure: '✕',
      info: 'ⓘ',
      warning: '⚠',
    }
    return icons[this.style || 'info']
  }

  private _handlePrimaryAction() {
    if (this.primaryAction?.onAction) {
      this.primaryAction.onAction()
    }
    this._dismiss()
  }

  private _handleSecondaryAction() {
    if (this.secondaryAction?.onAction) {
      this.secondaryAction.onAction()
    }
    this._dismiss()
  }

  private _dismiss() {
    const manager = ToastManager.getInstance()
    manager.dismissToast(this)
  }

  render() {
    return html`
      <div class="toast ${this.style || ''}">
        <div class="toast-icon">${this._getIcon()}</div>

        <div class="toast-content">
          <div class="toast-title">${this.title}</div>
          ${this.message ? html` <div class="toast-message">${this.message}</div> ` : ''}

          ${
            this.primaryAction || this.secondaryAction
              ? html`
                <div class="toast-actions">
                  ${
                    this.secondaryAction
                      ? html`
                        <button class="toast-action" @click=${this._handleSecondaryAction}>
                          ${this.secondaryAction.title}
                        </button>
                      `
                      : ''
                  }
                  ${
                    this.primaryAction
                      ? html`
                        <button class="toast-action primary" @click=${this._handlePrimaryAction}>
                          ${this.primaryAction.title}
                        </button>
                      `
                      : ''
                  }
                </div>
              `
              : ''
          }
        </div>
      </div>
    `
  }
}

// Toast container for managing toast placement
@customElement('fc-toast-container')
export class FCToastContainer extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    :host([position="top"]) {
      bottom: auto;
      top: 20px;
    }

    :host([position="top-left"]) {
      bottom: auto;
      top: 20px;
      right: auto;
      left: 20px;
    }

    :host([position="top-right"]) {
      bottom: auto;
      top: 20px;
      right: 20px;
    }

    :host([position="bottom-left"]) {
      bottom: 20px;
      right: auto;
      left: 20px;
    }

    :host([position="center"]) {
      bottom: auto;
      top: 50%;
      right: 50%;
      transform: translate(50%, -50%);
    }

    ::slotted(*) {
      pointer-events: auto;
    }
  `

  @property({ type: String })
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' = 'bottom-right'

  connectedCallback() {
    super.connectedCallback()
    const manager = ToastManager.getInstance()
    manager.registerContainer('default', this)
  }

  render() {
    return html` <slot></slot> `
  }
}

// Export for Raycast compatibility
export const Toast = FCToast
export const ToastContainer = FCToastContainer

// Add displayName for debugging
;(FCToast as any).displayName = 'Toast'
;(FCToastContainer as any).displayName = 'ToastContainer'
