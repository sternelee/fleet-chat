/**
 * FCAction - Fleet Chat Action Component
 * Raycast-compatible Action component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface IconProps {
  source: string;
  tintColor?: string;
  tooltip?: string;
}

export interface ActionProps {
  title: string;
  icon?: string | IconProps;
  shortcut?: string | KeyboardShortcut;
  onAction?: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
  style?: "default" | "destructive" | "secondary";
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ("cmd" | "ctrl" | "opt" | "alt" | "shift")[];
}

@customElement("fc-action")
export class FCAction extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .action-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      min-height: 36px;
      gap: 8px;
      position: relative;
    }

    .action-item:hover:not(.disabled) {
      background: var(--color-item-hover);
    }

    .action-item:active:not(.disabled) {
      transform: scale(0.98);
    }

    .action-item.active {
      background: var(--color-primary-alpha);
      color: var(--color-primary);
    }

    .action-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-item.destructive {
      color: var(--color-error, #ff3b30);
    }

    .action-item.destructive:hover:not(.disabled) {
      background: var(--color-error-alpha, rgba(255, 59, 48, 0.1));
    }

    .action-item.secondary {
      color: var(--color-text-secondary);
    }

    .action-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .action-icon img,
    .action-icon svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .action-text {
      flex: 1;
      font-size: var(--font-size-sm);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .action-shortcut {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 4px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .shortcut-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--color-key-background);
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .shortcut-plus {
      margin: 0 2px;
      opacity: 0.5;
    }

    /* Separator */
    .action-separator {
      height: 1px;
      background: var(--color-border);
      margin: 4px 12px;
    }

    /* Loading state */
    .action-loading {
      position: relative;
      color: transparent !important;
    }

    .action-loading::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      margin: -6px 0 0 -6px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      color: var(--color-text-secondary);
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Tooltip */
    .action-tooltip {
      position: fixed;
      background: var(--color-tooltip-background, #1c1c1e);
      color: var(--color-tooltip-text, #ffffff);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: var(--font-size-xs);
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .action-tooltip.visible {
      opacity: 1;
    }
  `;

  @property({ type: String })
  title: string = "";

  @property({ type: String })
  icon?: string | IconProps;

  @property({ type: String })
  shortcut?: string | KeyboardShortcut;

  @property({ type: Function })
  onAction?: () => void | Promise<void>;

  @property({ type: Boolean })
  disabled: boolean = false;

  @property({ type: Boolean })
  destructive: boolean = false;

  @property({ type: String })
  tooltip?: string;

  @property({ type: String })
  style: "default" | "destructive" | "secondary" = "default";

  @property({ type: Boolean })
  isLoading: boolean = false;

  @state()
  private tooltipVisible = false;

  @state()
  private tooltipPosition: { top: number; left: number } = { top: 0, left: 0 };

  private tooltipElement: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.createTooltipElement();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeTooltip();
  }

  private createTooltipElement() {
    if (this.tooltip) {
      this.tooltipElement = document.createElement("div");
      this.tooltipElement.className = "action-tooltip";
      this.tooltipElement.textContent = this.tooltip;
      document.body.appendChild(this.tooltipElement);
    }
  }

  private removeTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  private formatShortcut(shortcut: string | KeyboardShortcut | undefined): ReturnType<typeof html> {
    if (!shortcut) return html``;

    let modifiers: string[] = [];
    let key: string = "";

    if (typeof shortcut === "string") {
      const parts = shortcut.split("+");
      key = parts.pop() || "";
      modifiers = parts;
    } else {
      key = shortcut.key;
      modifiers = shortcut.modifiers || [];
    }

    // Normalize modifiers
    const normalizedModifiers = modifiers.map(m => {
      const lower = m.toLowerCase();
      if (lower === "cmd" || lower === "command") return "⌘";
      if (lower === "ctrl" || lower === "control") return "⌃";
      if (lower === "opt" || lower === "option" || lower === "alt") return "⌥";
      if (lower === "shift") return "⇧";
      return m;
    });

    // Normalize key
    const normalizedKey = this.formatKey(key);

    return html`
      <div class="action-shortcut">
        ${normalizedModifiers.map((mod, i) => html`
          ${i > 0 ? html`<span class="shortcut-plus">+</span>` : ""}
          <span class="shortcut-key">${mod}</span>
        `)}
        ${normalizedModifiers.length > 0 ? html`<span class="shortcut-plus">+</span>` : ""}
        <span class="shortcut-key">${normalizedKey}</span>
      </div>
    `;
  }

  private formatKey(key: string): string {
    const upper = key.toUpperCase();
    const keyMap: Record<string, string> = {
      "ENTER": "↩",
      "RETURN": "↩",
      "ESC": "⎋",
      "ESCAPE": "⎋",
      "SPACE": "␣",
      "TAB": "⇥",
      "DELETE": "⌫",
      "BACKSPACE": "⌫",
      "UP": "↑",
      "DOWN": "↓",
      "LEFT": "←",
      "RIGHT": "→",
      "HOME": "↖",
      "END": "↘",
      "PAGEUP": "⇞",
      "PAGEDOWN": "⇟",
    };
    return keyMap[upper] || upper;
  }

  private renderIcon(icon: string | IconProps | undefined) {
    if (!icon) return html``;

    const iconSrc = typeof icon === "string" ? icon : icon.source;
    const iconTint = typeof icon === "object" && icon.tintColor
      ? `color: ${icon.tintColor}`
      : "";

    if (iconSrc.startsWith("http") || iconSrc.startsWith("/")) {
      return html`<img src="${iconSrc}" alt="" style="${iconTint}" />`;
    }

    if (iconSrc.startsWith("<svg")) {
      return html`<div style="${iconTint}">${iconSrc}</div>`;
    }

    return html`<span style="${iconTint}">${iconSrc}</span>`;
  }

  private async handleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled || this.isLoading) {
      return;
    }

    if (this.onAction) {
      this.isLoading = true;

      try {
        await Promise.resolve(this.onAction());
      } catch (error) {
        console.error("Action execution error:", error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  private handleMouseEnter(event: MouseEvent) {
    if (this.tooltip && this.tooltipElement) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.tooltipPosition = {
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      };

      this.tooltipElement.style.top = `${this.tooltipPosition.top}px`;
      this.tooltipElement.style.left = `${this.tooltipPosition.left}px`;
      this.tooltipElement.style.transform = "translateX(-50%)";
      this.tooltipElement.classList.add("visible");
      this.tooltipVisible = true;
    }
  }

  private handleMouseLeave() {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove("visible");
      this.tooltipVisible = false;
    }
  }

  render() {
    const classes = [
      "action-item",
      this.disabled ? "disabled" : "",
      this.destructive || this.style === "destructive" ? "destructive" : "",
      this.style === "secondary" ? "secondary" : "",
      this.isLoading ? "action-loading" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div
        class="${classes}"
        @click=${this.handleClick}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
        role="button"
        tabindex="${this.disabled ? -1 : 0}"
        aria-label="${this.title}"
        aria-disabled="${this.disabled}"
      >
        ${this.icon ? html` <div class="action-icon">${this.renderIcon(this.icon)}</div> ` : ""}

        <div class="action-text">${this.title}</div>

        ${this.shortcut ? this.formatShortcut(this.shortcut) : ""}
      </div>
    `;
  }
}

@customElement("fc-action-panel")
export class FCActionPanel extends LitElement {
  static styles = css`
    :host {
      display: none;
    }

    :host([visible]) {
      display: block;
      position: fixed;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
      z-index: 1000;
      min-width: 200px;
      max-width: 300px;
    }

    .action-panel {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-header {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 4px;
    }
  `;

  @property({ type: String })
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right";

  @property({ type: Boolean, reflect: true })
  visible: boolean = false;

  @property({ type: Object })
  anchorPosition: { top: number; left: number } = { top: 0, left: 0 };

  @property({ type: String })
  title?: string;

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has("visible") || changedProperties.has("anchorPosition")) {
      this.updatePosition();
    }
  }

  private updatePosition() {
    if (!this.visible) return;

    const { top, left } = this.anchorPosition;
    const panelWidth = 240; // approximate width
    const panelHeight = Math.min(400, window.innerHeight - top - 20);

    let finalTop = top;
    let finalLeft = left;

    switch (this.position) {
      case "top-right":
        finalLeft = Math.min(left, window.innerWidth - panelWidth - 20);
        break;
      case "top-left":
        finalLeft = Math.max(20, left - panelWidth);
        break;
      case "bottom-right":
        finalLeft = Math.min(left, window.innerWidth - panelWidth - 20);
        finalTop = Math.max(20, top - panelHeight);
        break;
      case "bottom-left":
        finalLeft = Math.max(20, left - panelWidth);
        finalTop = Math.max(20, top - panelHeight);
        break;
    }

    this.style.top = `${finalTop}px`;
    this.style.left = `${finalLeft}px`;
    this.style.maxHeight = `${panelHeight}px`;
    this.style.overflowY = "auto";
  }

  private handleClickOutside(event: MouseEvent) {
    if (!this.contains(event.target as Node) && this.visible) {
      this.visible = false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleClickOutside.bind(this));
    document.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.handleClickOutside.bind(this));
    document.removeEventListener("keydown", this.handleKeydown.bind(this));
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.visible) {
      this.visible = false;
    }
  }

  render() {
    return html`
      <div class="action-panel">
        ${this.title ? html`<div class="panel-header">${this.title}</div>` : ""}
        <slot></slot>
      </div>
    `;
  }
}

// Separator component for action panels
@customElement("fc-action-separator")
export class FCActionSeparator extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .action-separator {
      height: 1px;
      background: var(--color-border);
      margin: 4px 0;
    }
  `;

  render() {
    return html`<div class="action-separator"></div>`;
  }
}

// Create ActionPanelItem component for easier usage
export interface ActionPanelItemProps {
  title: string;
  icon?: string | IconProps;
  shortcut?: string | KeyboardShortcut;
  onAction?: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
  id?: string;
}

@customElement("fc-action-panel-item")
export class FCActionPanelItem extends FCAction {
  // Inherit from FCAction but add panel-specific styling
  static styles = [
    ...(Array.isArray(FCAction.styles) ? FCAction.styles : [FCAction.styles]),
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  @property({ type: String })
  id?: string;
}

declare global {
  interface HTMLElementTagNameMap {
    "fc-action": FCAction;
    "fc-action-panel": FCActionPanel;
    "fc-action-separator": FCActionSeparator;
    "fc-action-panel-item": FCActionPanelItem;
  }
}

// Export for Raycast compatibility
export const Action = FCAction;
export const ActionPanel = FCActionPanel;
export const ActionPanelItem = FCActionPanelItem;
export const ActionPanelSeparator = FCActionSeparator;
