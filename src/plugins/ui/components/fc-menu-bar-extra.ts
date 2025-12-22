/**
 * FCMenuBarExtra - Fleet Chat Menu Bar Extra Component
 * Raycast-compatible MenuBarExtra component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface MenuBarExtraProps {
  icon?: string;
  title?: string;
  tooltip?: string;
}

@customElement("fleet-menu-bar-extra")
export class FCMenuBarExtra extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 24px;
      font-size: var(--font-size-xs);
      color: var(--color-text-primary);
      user-select: none;
    }

    :host(:hover) {
      background: var(--color-item-hover);
      border-color: var(--color-primary);
    }

    .menu-bar-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      margin-right: 6px;
    }

    .menu-bar-title {
      font-weight: 500;
      white-space: nowrap;
    }

    .menu-bar-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
      min-width: 200px;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: all 0.15s ease;
      margin-top: 4px;
    }

    :host([open]) .menu-bar-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 28px;
      font-size: var(--font-size-xs);
      color: var(--color-text-primary);
    }

    .menu-item:hover:not(.disabled) {
      background: var(--color-item-hover);
    }

    .menu-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-item-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .menu-item-text {
      flex: 1;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-item-shortcut {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .submenu {
      position: relative;
    }

    .submenu-children {
      position: absolute;
      left: 100%;
      top: 0;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
      min-width: 180px;
      z-index: 1001;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: all 0.15s ease;
    }

    .submenu:hover .submenu-children {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .separator {
      height: 1px;
      background: var(--color-border);
      margin: 4px 0;
    }
  `;

  @property({ type: String })
  icon?: string;

  @property({ type: String })
  title?: string;

  @property({ type: String })
  tooltip?: string;

  @property({ type: Boolean, reflect: true })
  open = false;

  private handleClick() {
    this.open = !this.open;
  }

  private handleItemClick(event: Event) {
    const target = event.target as HTMLElement;
    const item = target.closest(".menu-item");

    if (item && !item.classList.contains("disabled")) {
      const action = item.getAttribute("data-action");
      if (action) {
        this.dispatchEvent(
          new CustomEvent("menu-action", {
            detail: { action, element: item },
            bubbles: true,
          }),
        );
      }
      this.open = false;
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.open = false;
    } else if (event.key === "Enter" || event.key === " ") {
      this.open = !this.open;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleDocumentClick.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick.bind(this));
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
  }

  private handleDocumentClick(event: Event) {
    if (!this.contains(event.target as Node)) {
      this.open = false;
    }
  }

  render() {
    return html`
      <div class="menu-bar-trigger" @click=${this.handleClick} title="${this.tooltip || ""}">
        ${this.icon ? html`<div class="menu-bar-icon">${this.icon}</div>` : ""}
        ${this.title ? html`<span class="menu-bar-title">${this.title}</span>` : ""}
      </div>

      <div class="menu-bar-dropdown">
        <slot @click=${this.handleItemClick}></slot>
      </div>
    `;
  }
}

@customElement("fleet-menu-bar-item")
export class FCMenuBarItem extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 28px;
      font-size: var(--font-size-xs);
      color: var(--color-text-primary);
    }

    :host(:hover) {
      background: var(--color-item-hover);
    }

    .menu-item-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .menu-item-text {
      flex: 1;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-item-shortcut {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
  `;

  @property({ type: String })
  title?: string;

  @property({ type: String })
  icon?: string;

  @property({ type: String })
  shortcut?: string;

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent("menu-action", {
        detail: { action: this.title, element: this },
        bubbles: true,
      }),
    );
  }

  render() {
    return html`
      <div @click=${this.handleClick}>
        ${this.icon ? html`<div class="menu-item-icon">${this.icon}</div>` : ""}
        <div class="menu-item-text">${this.title}</div>
        ${this.shortcut ? html`<div class="menu-item-shortcut">${this.shortcut}</div>` : ""}
      </div>
    `;
  }
}

@customElement("fleet-menu-bar-submenu")
export class FCMenuBarSubmenu extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 28px;
      font-size: var(--font-size-xs);
      color: var(--color-text-primary);
      position: relative;
    }

    :host(:hover) {
      background: var(--color-item-hover);
    }

    .menu-item-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .menu-item-text {
      flex: 1;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-item-arrow {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--color-text-secondary);
    }

    .submenu-children {
      position: absolute;
      left: 100%;
      top: 0;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
      min-width: 180px;
      z-index: 1001;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: all 0.15s ease;
    }

    :host(:hover) .submenu-children {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  `;

  @property({ type: String })
  title?: string;

  @property({ type: String })
  icon?: string;

  render() {
    return html`
      <div>
        ${this.icon ? html`<div class="menu-item-icon">${this.icon}</div>` : ""}
        <div class="menu-item-text">${this.title}</div>
        <div class="menu-item-arrow">▶</div>
        <div class="submenu-children">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

@customElement("fleet-menu-bar-separator")
export class FCMenuBarSeparator extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 1px;
      background: var(--color-border);
      margin: 4px 0;
    }
  `;

  render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fleet-menu-bar-extra": FCMenuBarExtra;
    "fleet-menu-bar-item": FCMenuBarItem;
    "fleet-menu-bar-submenu": FCMenuBarSubmenu;
    "fleet-menu-bar-separator": FCMenuBarSeparator;
  }
}

