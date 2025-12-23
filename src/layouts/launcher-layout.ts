import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { noSelectStyles, scrollableStyles } from '#/styles/global.css'

/**
 * Simplified Launcher Layout
 * Similar to Raycast/Cmdk - a clean, centered search interface
 * No panels, no activity bars, just the search experience
 */
@customElement('launcher-layout')
export class LauncherLayout extends LitElement {
  render() {
    return html`
      <div class="launcher-container">
        <slot></slot>
      </div>
    `
  }

  static styles = [
    scrollableStyles,
    noSelectStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100vh;
        overflow: hidden;
      }

      .launcher-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: var(--color-foreground);
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      }

      /* Add a subtle pattern overlay */
      .launcher-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image:
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.05) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      }

      ::slotted(*) {
        position: relative;
        z-index: 1;
      }
    `
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'launcher-layout': LauncherLayout
  }
}
