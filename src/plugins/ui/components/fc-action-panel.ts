/**
 * FCActionPanel - Fleet Chat Action Panel Component
 * Raycast-compatible ActionPanel component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface ActionPanelProps {
  title?: string;
  message?: string;
  icon?: string;
}

@customElement("fleet-action-panel")
export class FCActionPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      max-width: 400px;
      z-index: 1000;
    }

    .action-panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .action-panel-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .action-panel-title {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .action-panel-message {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .action-panel-content {
      padding: 8px 0;
    }

    .action-panel-section {
      padding: 8px 0;
    }

    .action-panel-section-title {
      padding: 4px 16px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    ::slotted([slot="section"]) {
      display: block;
    }

    ::slotted(fleet-action) {
      display: block;
    }
  `;

  @property({ type: String })
  title?: string;

  @property({ type: String })
  message?: string;

  @property({ type: String })
  icon?: string;

  render() {
    return html`
      <div class="action-panel">
        ${this.title || this.message || this.icon
          ? html`
              <div class="action-panel-header">
                ${this.icon ? html`<div class="action-panel-icon">${this.icon}</div>` : ""}
                <div>
                  ${this.title ? html`<h3 class="action-panel-title">${this.title}</h3>` : ""}
                  ${this.message ? html`<p class="action-panel-message">${this.message}</p>` : ""}
                </div>
              </div>
            `
          : ""}

        <div class="action-panel-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

@customElement("fleet-action-panel-section")
export class FCActionPanelSection extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .section-header {
      padding: 4px 16px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .section-content {
      padding: 4px 0;
    }

    ::slotted(fleet-action) {
      display: block;
    }
  `;

  @property({ type: String })
  title?: string;

  render() {
    return html`
      <div class="section">
        ${this.title ? html`<h4 class="section-header">${this.title}</h4>` : ""}
        <div class="section-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fleet-action-panel": FCActionPanel;
    "fleet-action-panel-section": FCActionPanelSection;
  }
}

