/**
 * MenuBarExtra Component
 *
 * Raycast-compatible MenuBarExtra component built with Lit
 */

import { css, html, LitElement, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export interface MenuBarExtraItemProps {
  title: string
  icon?: string | { light: string; dark: string }
  tooltip?: string
  shortcut?: string
  onAction?: () => void
}

@customElement('fc-menu-bar-extra')
export class MenuBarExtra extends LitElement {
  @property({ attribute: false })
  private menuChildren: TemplateResult[] = []

  // Create a setter/getter for children
  set children(value: TemplateResult[]) {
    this.menuChildren = value
    this.requestUpdate()
  }

  get children(): TemplateResult[] {
    return this.menuChildren
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .menu-bar-extra {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
    }

    .menu-bar-extra:hover {
      background-color: var(--background-hover, rgba(0, 0, 0, 0.1));
    }

    .menu-bar-extra:active {
      background-color: var(--background-active, rgba(0, 0, 0, 0.15));
    }

    .menu-bar-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--background, white);
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 200px;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
      margin-top: 4px;
    }

    .menu-dropdown.visible {
      display: block;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      color: var(--text, #333);
      font-size: 14px;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border, #e5e5e5);
    }

    .menu-item:last-child {
      border-bottom: none;
    }

    .menu-item:hover {
      background-color: var(--background-hover, #f5f5f5);
    }

    .menu-item:active {
      background-color: var(--background-active, #e8e8e8);
    }

    .menu-item-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .menu-item-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-item-shortcut {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-secondary, #666);
      background: var(--background-secondary, #f0f0f0);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--background-tooltip, #333);
      color: var(--text-tooltip, white);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1001;
      margin-bottom: 4px;
      display: none;
    }

    .tooltip.visible {
      display: block;
    }
  `

  @property({ type: String })
  icon?: string | { light: string; dark: string }

  @property({ type: String })
  tooltip?: string

  private isDropdownVisible = false

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this.handleDocumentClick.bind(this))
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this.handleDocumentClick.bind(this))
  }

  private handleDocumentClick(event: Event) {
    const target = event.target as Node
    if (!this.contains(target)) {
      this.isDropdownVisible = false
      this.requestUpdate()
    }
  }

  private toggleDropdown() {
    this.isDropdownVisible = !this.isDropdownVisible
    this.requestUpdate()
  }

  private handleItemClick(item: MenuBarExtraItemProps) {
    if (item.onAction) {
      item.onAction()
    }
    this.isDropdownVisible = false
    this.requestUpdate()
  }

  render() {
    const iconSrc = typeof this.icon === 'string' ? this.icon : this.icon?.light || this.icon?.dark

    return html`
      <div class="menu-bar-extra" @click=${this.toggleDropdown}>
        ${iconSrc ? html`<img class="menu-bar-icon" src="${iconSrc}" alt="Menu Bar Icon" />` : ''}
        ${
          this.menuChildren && this.menuChildren.length > 0
            ? html`
              <div class="menu-dropdown ${this.isDropdownVisible ? 'visible' : ''}">
                ${this.menuChildren.map((child) => {
                  // Extract props from the child template result if it's a MenuBarExtraItem
                  if (child && child.values && child.values.length > 0) {
                    // This is a simplified approach - in production you'd want more sophisticated
                    // extraction of component props from the template result
                    return child
                  }
                  return child
                })}
              </div>
            `
            : ''
        }
        ${
          this.tooltip
            ? html`
              <div class="tooltip ${this.isDropdownVisible ? '' : 'visible'}">${this.tooltip}</div>
            `
            : ''
        }
      </div>
    `
  }
}

// MenuBarExtra Item Component
@customElement('fc-menu-bar-extra-item')
export class MenuBarExtraItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      color: var(--text, #333);
      font-size: 14px;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border, #e5e5e5);
    }

    .menu-item:last-child {
      border-bottom: none;
    }

    .menu-item:hover {
      background-color: var(--background-hover, #f5f5f5);
    }

    .menu-item:active {
      background-color: var(--background-active, #e8e8e8);
    }

    .menu-item-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .menu-item-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-item-shortcut {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-secondary, #666);
      background: var(--background-secondary, #f0f0f0);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .separator {
      height: 1px;
      background: var(--border, #e5e5e5);
      margin: 4px 0;
      cursor: default;
    }
  `

  @property({ type: String })
  title: string = ''

  @property({ type: String })
  icon?: string | { light: string; dark: string }

  @property({ type: String })
  shortcut?: string

  @property({ type: Boolean })
  separator = false

  @property({ type: Function })
  onAction?: () => void

  private handleClick() {
    if (this.separator) return

    if (this.onAction) {
      this.onAction()
    }

    // Dispatch a custom event for parent to handle
    this.dispatchEvent(
      new CustomEvent('menu-bar-item-click', {
        detail: {
          title: this.title,
          icon: this.icon,
          shortcut: this.shortcut,
          onAction: this.onAction,
        },
        bubbles: true,
      }),
    )
  }

  render() {
    if (this.separator) {
      return html`<div class="separator"></div>`
    }

    const iconSrc = typeof this.icon === 'string' ? this.icon : this.icon?.light || this.icon?.dark

    return html`
      <button class="menu-item" @click=${this.handleClick}>
        ${iconSrc ? html`<img class="menu-item-icon" src="${iconSrc}" alt="${this.title}" />` : ''}
        ${this.title ? html`<span class="menu-item-text">${this.title}</span>` : ''}
        ${this.shortcut ? html`<span class="menu-item-shortcut">${this.shortcut}</span>` : ''}
        <slot></slot>
      </button>
    `
  }
}

// MenuBarExtra Separator Component
@customElement('fc-menu-bar-extra-separator')
export class MenuBarExtraSeparator extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .separator {
      height: 1px;
      background: var(--border, #e5e5e5);
      margin: 4px 0;
    }
  `

  render() {
    return html`<div class="separator"></div>`
  }
}

// Type definitions for external use
export interface MenuBarExtraProps {
  icon?: string | { light: string; dark: string }
  tooltip?: string
  children?: TemplateResult[]
}

declare global {
  interface HTMLElementTagNameMap {
    'fc-menu-bar-extra': MenuBarExtra
    'fc-menu-bar-extra-item': MenuBarExtraItem
    'fc-menu-bar-extra-separator': MenuBarExtraSeparator
  }
}

// Raycast-compatible exports
export {
  MenuBarExtra as FCMenuBarExtra,
  MenuBarExtraItem as FCMenuBarExtraItem,
  MenuBarExtraSeparator as FCMenuBarExtraSeparator,
}
