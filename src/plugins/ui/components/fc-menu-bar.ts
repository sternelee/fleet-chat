/**
 * FCMenuBar - Fleet Chat Menu Bar Component
 * Raycast-compatible menu bar component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface MenuItem {
  title: string;
  icon?: string;
  shortcut?: string;
  onAction?: () => void | Promise<void>;
  children?: MenuItem[];
}

export interface MenuBarProps {
  items: MenuItem[];
  title?: string;
}

@customElement("fc-menu-bar")
export class FCMenuBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .menu-bar {
      display: flex;
      padding: 4px;
      gap: 2px;
      background: var(--color-panel-background);
      border-bottom: 1px solid var(--color-border);
    }

    .menu-bar-title {
      padding: 8px 12px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 32px;
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      user-select: none;
    }

    .menu-item:hover:not(.disabled) {
      background: var(--color-item-hover);
      color: var(--color-text-primary);
    }

    .menu-item.active {
      background: var(--color-primary-alpha);
      color: var(--color-primary);
    }

    .menu-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-item-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
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
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .menu-content {
      padding: 4px;
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
      min-width: 200px;
      z-index: 1000;
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
      margin: 4px 12px;
    }
  `;

  @property({ type: Array })
  items: MenuItem[] = [];

  @property({ type: String })
  title?: string;

  private activeSubmenu: string | null = null;

  private handleClick(item: MenuItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (item.children && item.children.length > 0) {
      this.activeSubmenu = this.activeSubmenu === item.title ? null : item.title;
    } else if (item.onAction) {
      item.onAction();
      this.activeSubmenu = null;
    }
  }

  private handleKeyDown(event: KeyboardEvent, item: MenuItem) {
    if (event.key === "Enter" || event.key === " ") {
      this.handleClick(item, event);
    }
  }

  private renderMenuItem(item: MenuItem, depth: number = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenu = depth > 0;

    return html`
      <div
        class="menu-item ${hasChildren ? "submenu" : ""}"
        @click=${(e: Event) => this.handleClick(item, e)}
        @keydown=${(e: KeyboardEvent) => this.handleKeyDown(e, item)}
        role="menuitem"
        tabindex="${!item.onAction && !hasChildren ? -1 : 0}"
        aria-label="${item.title}"
        aria-haspopup="${hasChildren ? "true" : "false"}"
      >
        ${item.icon ? html` <div class="menu-item-icon">${item.icon}</div> ` : ""}

        <div class="menu-item-text">${item.title}</div>

        ${item.shortcut ? html` <div class="menu-item-shortcut">${item.shortcut}</div> ` : ""}
        ${hasChildren ? html` <div class="menu-item-icon">▶</div> ` : ""}
        ${hasChildren && this.activeSubmenu === item.title
          ? html`
              <div class="submenu-children">
                ${item.children!.map((child) => this.renderMenuItem(child, depth + 1))}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderSeparator() {
    return html`<div class="separator"></div>`;
  }

  private renderItems() {
    return this.items.map((item, index) => {
      // Check if this should be a separator (title change or specific conditions)
      if (item.title === "-") {
        return this.renderSeparator();
      }
      return this.renderMenuItem(item);
    });
  }

  render() {
    return html`
      <div class="menu-bar">
        ${this.title ? html` <div class="menu-bar-title">${this.title}</div> ` : ""}

        <div class="menu-content">${this.renderItems()}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fc-menu-bar": FCMenuBar;
  }
}

