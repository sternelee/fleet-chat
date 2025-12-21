/**
 * FCGrid - Fleet Chat Grid Component
 * Raycast-compatible Grid component built with Lit
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface GridItemProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  content?: any;
  actions?: Array<{
    title: string;
    icon?: string;
    onAction: () => void;
  }>;
}

@customElement('fc-grid')
export class FCGrid extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      background: var(--color-background);
      color: var(--color-text-primary);
      font-family: var(--font-family-system);
    }

    .grid-container {
      padding: 16px;
    }

    .grid-header {
      margin-bottom: 16px;
    }

    .grid-search {
      width: 100%;
      padding: 8px 12px;
      background: var(--color-input);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text-primary);
      font-size: var(--font-size-base);
      outline: none;
      transition: border-color 0.2s ease;
    }

    .grid-search:focus {
      border-color: var(--color-primary);
    }

    .grid-items {
      display: grid;
      gap: 16px;
      animation: fadeIn 0.3s ease-out;
    }

    .grid-columns-1 { grid-template-columns: 1fr; }
    .grid-columns-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-columns-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-columns-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-columns-5 { grid-template-columns: repeat(5, 1fr); }
    .grid-columns-6 { grid-template-columns: repeat(6, 1fr); }

    /* Responsive grid */
    @media (max-width: 768px) {
      .grid-columns-3,
      .grid-columns-4,
      .grid-columns-5,
      .grid-columns-6 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .grid-columns-2,
      .grid-columns-3,
      .grid-columns-4,
      .grid-columns-5,
      .grid-columns-6 {
        grid-template-columns: 1fr;
      }
    }

    .grid-item {
      display: flex;
      flex-direction: column;
      background: var(--color-item-background);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .grid-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: var(--color-primary);
    }

    .grid-item.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }

    .grid-item-fit {
      aspect-ratio: 1;
    }

    .grid-item-content {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      justify-content: center;
    }

    .grid-item-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-icon-background);
      color: var(--color-icon);
      font-size: 24px;
      flex-shrink: 0;
    }

    .grid-item-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
    }

    .grid-item-title {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: var(--font-size-base);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .grid-item-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
      line-height: 1.3;
    }

    .grid-item-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .grid-item:hover .grid-item-actions {
      opacity: 1;
    }

    .grid-action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: background-color 0.2s ease;
      margin-left: 4px;
    }

    .grid-action-btn:hover {
      background: rgba(0, 0, 0, 0.9);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: var(--color-text-secondary);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    .empty-description {
      font-size: var(--font-size-sm);
      max-width: 300px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top: 3px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    .loading-text {
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Aspect ratio support */
    .aspect-ratio-16-9 {
      aspect-ratio: 16/9;
    }

    .aspect-ratio-4-3 {
      aspect-ratio: 4/3;
    }

    .aspect-ratio-1-1 {
      aspect-ratio: 1;
    }

    .aspect-ratio-3-2 {
      aspect-ratio: 3/2;
    }
  `;

  @property({ type: Array })
  items: GridItemProps[] = [];

  @property({ type: Number })
  columns: number = 3;

  @property({ type: String })
  aspectRatio: 'auto' | '16-9' | '4-3' | '1-1' | '3-2' = 'auto';

  @property({ type: Boolean })
  fit: boolean = false;

  @property({ type: String })
  searchPlaceholder: string = 'Search items...';

  @property({ type: Boolean })
  enableSearch: boolean = true;

  @property({ type: Boolean })
  isLoading: boolean = false;

  @property({ type: String })
  emptyStateTitle: string = 'No Items';

  @property({ type: String })
  emptyStateDescription: string = '';

  @property({ type: String })
  emptyStateIcon: string = '📋';

  private filteredItems: GridItemProps[] = [];

  protected firstUpdated() {
    this.filteredItems = this.items;
  }

  protected updated(changedProperties: any) {
    if (changedProperties.has('items') || changedProperties.has('searchQuery')) {
      this.filterItems();
    }
  }

  private filterItems() {
    // Basic filtering - in a real implementation, this would handle search
    this.filteredItems = [...this.items];
  }

  private getGridClassName(): string {
    const columns = Math.min(Math.max(this.columns, 1), 6);
    return `grid-columns-${columns}`;
  }

  private getAspectRatioClassName(): string {
    return this.aspectRatio !== 'auto' ? `aspect-ratio-${this.aspectRatio}` : '';
  }

  private getItemClassName(): string {
    const classes = ['grid-item'];
    
    if (this.fit) {
      classes.push('grid-item-fit');
    }
    
    if (this.aspectRatio !== 'auto') {
      classes.push(this.getAspectRatioClassName());
    }
    
    return classes.join(' ');
  }

  private renderSearchInput() {
    if (!this.enableSearch) return html``;

    return html`
      <div class="grid-header">
        <input
          type="text"
          class="grid-search"
          placeholder=${this.searchPlaceholder}
          @input=${this.handleSearchInput}
        />
      </div>
    `;
  }

  private handleSearchInput(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    const query = target.value.toLowerCase();
    
    if (!query) {
      this.filteredItems = this.items;
      return;
    }

    this.filteredItems = this.items.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.subtitle?.toLowerCase().includes(query)
    );
  }

  private renderLoadingState() {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading items...</div>
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">${this.emptyStateIcon}</div>
        <div class="empty-title">${this.emptyStateTitle}</div>
        <div class="empty-description">${this.emptyStateDescription}</div>
      </div>
    `;
  }

  private renderItem(item: GridItemProps, index: number) {
    const itemActions = item.actions || [];
    
    return html`
      <div
        class="grid-item"
        @click=${() => this.handleItemClick(item)}
      >
        ${itemActions.length > 0 ? html`
          <div class="grid-item-actions">
            ${itemActions.slice(0, 2).map(action => html`
              <button
                class="grid-action-btn"
                @click=${(e: Event) => this.handleActionClick(e, action)}
                title="${action.title}"
              >
                ${action.icon || '⚡'}
              </button>
            `)}
          </div>
        ` : ''}
        
        <div class="grid-item-content">
          ${item.icon ? html`
            <div class="grid-item-icon">
              ${item.icon.startsWith('http') ? 
                html`<img src="${item.icon}" alt="${item.title}">` : 
                item.icon
              }
            </div>
          ` : ''}
          
          <div class="grid-item-title">${item.title}</div>
          ${item.subtitle ? html`
            <div class="grid-item-subtitle">${item.subtitle}</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private handleItemClick(item: GridItemProps) {
    this.dispatchEvent(new CustomEvent('itemSelected', {
      detail: { item },
      bubbles: true,
      composed: true
    }));
  }

  private handleActionClick(event: Event, action: { title: string; onAction: () => void }) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      action.onAction();
    } catch (error) {
      console.error('Action execution error:', error);
    }
  }

  render() {
    if (this.isLoading) {
      return this.renderLoadingState();
    }

    return html`
      <div class="grid-container">
        ${this.renderSearchInput()}
        
        ${this.filteredItems.length > 0 ? html`
          <div class="grid-items ${this.getGridClassName()}">
            ${this.filteredItems.map((item, index) => this.renderItem(item, index))}
          </div>
        ` : this.renderEmptyState()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fc-grid': FCGrid;
  }
}