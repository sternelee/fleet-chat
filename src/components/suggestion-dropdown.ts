import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';

interface SuggestionItem {
  id: string;
  name: string;
  path?: string;
  icon?: string;
  type: 'app' | 'file';
}

interface Position {
  top: number;
  left: number;
}

/**
 * Autocomplete Suggestion Dropdown
 * Shows suggestions for @mention (apps) and #mention (files)
 */
@customElement('suggestion-dropdown')
export class SuggestionDropdown extends LitElement {
  @property({ type: String }) mentionType: 'app' | 'file' = 'app';
  @property({ type: Array }) suggestions: SuggestionItem[] = [];
  @property({ type: Object }) position: Position = { top: 0, left: 0 };
  @property({ type: Boolean }) visible = false;
  
  @state() private selectedIndex = 0;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('suggestions')) {
      // Reset selection when suggestions change
      this.selectedIndex = 0;
    }
    
    if (changedProperties.has('visible') && this.visible) {
      // Scroll selected item into view
      this._scrollToSelected();
    }
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (!this.visible || this.suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this._scrollToSelected();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this._scrollToSelected();
        break;
      case 'Enter':
      case 'Tab':
        if (this.suggestions.length > 0) {
          e.preventDefault();
          this._selectItem(this.suggestions[this.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._close();
        break;
    }
  };

  private _scrollToSelected() {
    requestAnimationFrame(() => {
      const selectedElement = this.shadowRoot?.querySelector('.suggestion-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  private _selectItem(item: SuggestionItem) {
    this.dispatchEvent(
      new CustomEvent('suggestion-select', {
        detail: item,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _close() {
    this.dispatchEvent(
      new CustomEvent('suggestion-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.visible || this.suggestions.length === 0) {
      return null;
    }

    return html`
      <div
        class="suggestion-dropdown"
        style="top: ${this.position.top}px; left: ${this.position.left}px;"
      >
        <div class="suggestion-header">
          <span class="suggestion-type-icon">${this.mentionType === 'app' ? '@' : '#'}</span>
          <span class="suggestion-type-label">
            ${this.mentionType === 'app' ? 'Applications' : 'Files'}
          </span>
        </div>
        <div class="suggestion-list">
          ${repeat(
            this.suggestions,
            (item) => item.id,
            (item, index) => this._renderSuggestionItem(item, index)
          )}
        </div>
        <div class="suggestion-footer">
          <span class="suggestion-hint">↑↓ to navigate • ↵ to select • esc to close</span>
        </div>
      </div>
    `;
  }

  private _renderSuggestionItem(item: SuggestionItem, index: number) {
    const isSelected = index === this.selectedIndex;

    return html`
      <div
        class=${classMap({
          'suggestion-item': true,
          'selected': isSelected,
        })}
        @click=${() => this._selectItem(item)}
        @mouseenter=${() => { this.selectedIndex = index; }}
      >
        <div class="suggestion-icon">
          ${item.icon ? html`<img src="${item.icon}" alt="${item.name}" />` : html`${item.name.charAt(0).toUpperCase()}`}
        </div>
        <div class="suggestion-content">
          <div class="suggestion-name">${item.name}</div>
          ${item.path ? html`<div class="suggestion-path">${item.path}</div>` : null}
        </div>
        <div class="suggestion-badge ${item.type}">
          ${item.type === 'app' ? '@' : '#'}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      z-index: 10000;
    }

    .suggestion-dropdown {
      position: absolute;
      background: rgba(17, 24, 39, 0.98);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
      min-width: 400px;
      max-width: 500px;
      max-height: 400px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestion-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .suggestion-type-icon {
      font-weight: 700;
      font-size: 16px;
      color: rgba(102, 126, 234, 0.9);
    }

    .suggestion-type-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .suggestion-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .suggestion-list::-webkit-scrollbar {
      width: 6px;
    }

    .suggestion-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .suggestion-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .suggestion-list::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }

    .suggestion-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: transparent;
      transition: all 0.15s ease;
    }

    .suggestion-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .suggestion-item.selected {
      background: rgba(102, 126, 234, 0.15);
    }

    .suggestion-item.selected::before {
      background: rgba(102, 126, 234, 0.8);
    }

    .suggestion-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .suggestion-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .suggestion-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .suggestion-name {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestion-path {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
    }

    .suggestion-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      opacity: 0.8;
    }

    .suggestion-badge.app {
      background: rgba(59, 130, 246, 0.2);
      color: rgba(147, 197, 253, 0.9);
    }

    .suggestion-badge.file {
      background: rgba(34, 197, 94, 0.2);
      color: rgba(134, 239, 172, 0.9);
    }

    .suggestion-footer {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .suggestion-hint {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'suggestion-dropdown': SuggestionDropdown;
  }
}
