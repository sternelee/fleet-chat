/**
 * FCAction - Fleet Chat Action Component
 * Raycast-compatible Action component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface ActionProps {
  title: string;
  icon?: string;
  shortcut?: string;
  onAction?: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
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
    }

    .action-item:hover:not(.disabled) {
      background: var(--color-item-hover);
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
      color: var(--color-error);
    }

    .action-item.destructive:hover:not(.disabled) {
      background: var(--color-error-alpha);
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

    .action-text {
      flex: 1;
      font-size: var(--font-size-sm);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .action-shortcut {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .action-shortcut-key {
      display: inline-block;
      min-width: 12px;
      text-align: center;
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
      color: transparent;
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
      position: absolute;
      background: var(--color-tooltip-background);
      color: var(--color-tooltip-text);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: var(--font-size-xs);
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .action-tooltip.visible {
      opacity: 1;
    }
  `;

  @property({ type: String })
  title: string = "";

  @property({ type: String })
  icon?: string;

  @property({ type: String })
  shortcut?: string;

  @property({ type: Function })
  onAction?: () => void | Promise<void>;

  @property({ type: Boolean })
  disabled: boolean = false;

  @property({ type: Boolean })
  destructive: boolean = false;

  @property({ type: String })
  tooltip?: string;

  @property({ type: Boolean })
  isLoading: boolean = false;

  @property({ type: Boolean })
  showTooltip: boolean = false;

  @state()
  private tooltipPosition: { top: number; left: number } = { top: 0, left: 0 };

  private tooltipElement: HTMLElement | null = null;

  protected firstUpdated() {
    this.createTooltipElement();
  }

  private createTooltipElement() {
    if (this.tooltip) {
      this.tooltipElement = document.createElement("div");
      this.tooltipElement.className = "action-tooltip";
      this.tooltipElement.textContent = this.tooltip;
      document.body.appendChild(this.tooltipElement);
    }
  }

  private formatShortcut(shortcut: string): string {
    return shortcut
      .split("+")
      .map((key) => {
        const keyElement = document.createElement("span");
        keyElement.className = "action-shortcut-key";
        keyElement.textContent = key.trim();
        return keyElement.outerHTML;
      })
      .join(" + ");
  }

  private handleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled || this.isLoading) {
      return;
    }

    if (this.onAction) {
      this.isLoading = true;

      Promise.resolve(this.onAction())
        .catch((error) => {
          console.error("Action execution error:", error);
        })
        .finally(() => {
          this.isLoading = false;
        });
    }
  }

  private handleMouseEnter(event: MouseEvent) {
    if (this.tooltip && this.tooltipElement) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.tooltipPosition = {
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      };

      this.tooltipElement.style.top = `${this.tooltipPosition.top}px`;
      this.tooltipElement.style.left = `${this.tooltipPosition.left}px`;
      this.tooltipElement.style.transform = "translateX(-50%)";
      this.tooltipElement.classList.add("visible");
      this.showTooltip = true;
    }
  }

  private handleMouseLeave() {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove("visible");
      this.showTooltip = false;
    }
  }

  updated(changedProperties: any) {
    super.updated(changedProperties);

    if (changedProperties.has("tooltip")) {
      // Recreate tooltip if it changed
      if (this.tooltipElement) {
        this.tooltipElement.remove();
        this.tooltipElement = null;
      }
      this.createTooltipElement();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  render() {
    const classes = [
      "action-item",
      this.disabled ? "disabled" : "",
      this.destructive ? "destructive" : "",
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
        ${this.icon ? html` <div class="action-icon">${this.icon}</div> ` : ""}

        <div class="action-text">${this.title}</div>

        ${this.shortcut
        ? html` <div class="action-shortcut">${this.formatShortcut(this.shortcut)}</div> `
        : ""}
      </div>
    `;
  }
}

@customElement("fc-action-panel")
export class FCActionPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      right: 12px;
      top: 12px;
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

    /* Positioning variants */
    .position-top-right {
      top: 12px;
      right: 12px;
      bottom: auto;
      left: auto;
    }

    .position-top-left {
      top: 12px;
      left: 12px;
      right: auto;
      bottom: auto;
    }

    .position-bottom-right {
      bottom: 12px;
      right: 12px;
      top: auto;
      left: auto;
    }

    .position-bottom-left {
      bottom: 12px;
      left: 12px;
      right: auto;
      top: auto;
    }
  `;

  @property({ type: String })
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right";

  @property({ type: Boolean })
  visible: boolean = true;

  private handleClickOutside(event: MouseEvent) {
    if (!this.contains(event.target as Node)) {
      this.visible = false;
      this.requestUpdate();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleClickOutside.bind(this));
  }

  render() {
    if (!this.visible) {
      return html``;
    }

    const positionClass = `position-${this.position}`;

    return html`
      <div class="action-panel ${positionClass}">
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
  icon?: string;
  shortcut?: string;
  onAction?: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
  tooltip?: string;
}

@customElement("fc-action-panel-item")
export class FCActionPanelItem extends FCAction {
  // Inherit from FCAction but add panel-specific styling
  static styles = [
    ...FCAction.styles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];
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
