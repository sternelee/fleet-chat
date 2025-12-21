/**
 * FCList - Fleet Chat List Component
 * Raycast-compatible List component built with Lit
 */

import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ListItemProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  accessories?: ListAccessory[];
  actions?: ListAction[];
  keywords?: string[];
}

export interface ListAccessory {
  text?: string;
  icon?: string;
  tooltip?: string;
  tag?: {
    value: string;
    color?: string;
  };
}

export interface ListAction {
  title: string;
  icon?: string;
  shortcut?: string;
  onAction: () => void | Promise<void>;
}

@customElement('fc-list')
export class FCList extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      background: var(--color-background);
      color: var(--color-text-primary);
      font-family: var(--font-family-system);
      font-size: var(--font-size-base);
      line-height: 1.5;
    }

    .list-container {
      padding: 8px 0;
    }

    .search-container {
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-border);
    }

    .search-input {
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

    .search-input:focus {
      border-color: var(--color-primary);
    }

    .list-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      user-select: none;
    }

    .list-item:hover {
      background: var(--color-item-hover);
    }

    .list-item.selected {
      background: var(--color-item-selected);
    }

    .item-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-icon-background);
      color: var(--color-icon);
      font-size: 16px;
      flex-shrink: 0;
    }

    .item-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 6px;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-weight: 500;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-accessories {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
    }

    .accessory {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .accessory-icon {
      width: 12px;
      height: 12px;
      opacity: 0.7;
    }

    .accessory-tag {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      background: var(--color-tag-background);
      color: var(--color-tag-text);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      color: var(--color-text-secondary);
      text-align: center;
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
    }

    .empty-description {
      font-size: var(--font-size-sm);
      max-width: 300px;
    }

    .loading-skeleton {
      display: flex;
      align-items: center;
      padding: 8px 12px;
    }

    .skeleton-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      border-radius: 6px;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    .skeleton-content {
      flex: 1;
    }

    .skeleton-title {
      height: 16px;
      width: 60%;
      margin-bottom: 6px;
      border-radius: 3px;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    .skeleton-subtitle {
      height: 14px;
      width: 40%;
      border-radius: 3px;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Action Panel */
    .action-panel {
      position: absolute;
      right: 12px;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 4px;
      z-index: 1000;
      min-width: 200px;
    }

    .action-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .action-item:hover {
      background: var(--color-item-hover);
    }

    .action-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
    }

    .action-text {
      flex: 1;
    }

    .action-shortcut {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
    }
  `;

  @property({ type: Array })
  items: ListItemProps[] = [];

  @property({ type: String })
  searchPlaceholder: string = 'Search...';

  @property({ type: Boolean })
  isLoading: boolean = false;

  @property({ type: Boolean })
  enableSearch: boolean = true;

  @property({ type: String })
  emptyStateTitle: string = 'No Items';

  @property({ type: String })
  emptyStateDescription: string = '';

  @property({ type: String })
  emptyStateIcon: string = '📋';

  @state()
  private _selectedIndex = 0;

  @state()
  private _searchQuery = '';

  @state()
  private _filteredItems: ListItemProps[] = [];

  @state()
  private _actionPanelVisible = false;

  @state()
  private _actionPanelItem: ListItemProps | null = null;

  @state()
  private _actionPanelPosition = { top: 0, right: 0 };

  protected firstUpdated() {
    this._filteredItems = this.items;
    this.addEventListener('keydown', this._handleKeydown);
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has('items') || changedProps.has('_searchQuery')) {
      this._filterItems();
    }
  }

  private _filterItems() {
    if (!this._searchQuery) {
      this._filteredItems = [...this.items];
    } else {
      const query = this._searchQuery.toLowerCase();
      this._filteredItems = this.items.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const subtitleMatch = item.subtitle?.toLowerCase().includes(query) ?? false;
        const keywordsMatch = item.keywords?.some(keyword => 
          keyword.toLowerCase().includes(query)
        ) ?? false;
        
        return titleMatch || subtitleMatch || keywordsMatch;
      });
    }

    // Reset selection if out of bounds
    if (this._selectedIndex >= this._filteredItems.length) {
      this._selectedIndex = Math.max(0, this._filteredItems.length - 1);
    }
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._selectedIndex = Math.min(this._selectedIndex + 1, this._filteredItems.length - 1);
        this._scrollToSelected();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        this._scrollToSelected();
        break;
      
      case 'Enter':
        event.preventDefault();
        if (this._filteredItems[this._selectedIndex]) {
          this._selectItem(this._filteredItems[this._selectedIndex]);
        }
        break;
      
      case 'Escape':
        this._hideActionPanel();
        break;
    }
  };

  private _scrollToSelected() {
    const items = this.shadowRoot?.querySelectorAll('.list-item');
    if (items && items[this._selectedIndex]) {
      (items[this._selectedIndex] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  private _selectItem(item: ListItemProps) {
    this.dispatchEvent(new CustomEvent('itemSelected', {
      detail: { item },
      bubbles: true,
      composed: true
    }));
  }

  private _showActionPanel(item: ListItemProps, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    this._actionPanelItem = item;
    this._actionPanelPosition = {
      top: rect.top,
      right: window.innerWidth - rect.right
    };
    this._actionPanelVisible = true;
  }

  private _hideActionPanel() {
    this._actionPanelVisible = false;
    this._actionPanelItem = null;
  }

  private _executeAction(action: ListAction) {
    try {
      action.onAction();
    } catch (error) {
      console.error('Error executing action:', error);
    }
    this._hideActionPanel();
  }

  private _renderSearchInput() {
    if (!this.enableSearch) return html``;

    return html`
      <div class="search-container">
        <input
          type="text"
          class="search-input"
          placeholder=${this.searchPlaceholder}
          value=${this._searchQuery}
          @input=${(e: InputEvent) => {
            this._searchQuery = (e.target as HTMLInputElement).value;
          }}
        />
      </div>
    `;
  }

  private _renderLoadingSkeleton() {
    return html`
      ${Array.from({ length: 5 }, () => html`
        <div class="loading-skeleton">
          <div class="skeleton-icon"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-subtitle"></div>
          </div>
        </div>
      `)}
    `;
  }

  private _renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">${this.emptyStateIcon}</div>
        <div class="empty-title">${this.emptyStateTitle}</div>
        <div class="empty-description">${this.emptyStateDescription}</div>
      </div>
    `;
  }

  private _renderItem(item: ListItemProps, index: number) {
    const isSelected = index === this._selectedIndex;

    return html`
      <div
        class="list-item ${isSelected ? 'selected' : ''}"
        @click=${() => this._selectItem(item)}
        @contextmenu=${(e: MouseEvent) => item.actions ? this._showActionPanel(item, e) : null}
      >
        ${item.icon ? html`
          <div class="item-icon">
            ${item.icon.startsWith('http') ? 
              html`<img src="${item.icon}" alt="${item.title}">` : 
              item.icon
            }
          </div>
        ` : ''}
        
        <div class="item-content">
          <div class="item-title">${item.title}</div>
          ${item.subtitle ? html`
            <div class="item-subtitle">${item.subtitle}</div>
          ` : ''}
        </div>

        ${item.accessories && item.accessories.length > 0 ? html`
          <div class="item-accessories">
            ${item.accessories.map(accessory => html`
              <div class="accessory">
                ${accessory.icon ? html`
                  <span class="accessory-icon">${accessory.icon}</span>
                ` : ''}
                ${accessory.text ? html`
                  <span>${accessory.text}</span>
                ` : ''}
                ${accessory.tag ? html`
                  <span class="accessory-tag" style="
                    ${accessory.tag.color ? `background: ${accessory.tag.color};` : ''}
                  ">
                    ${accessory.tag.value}
                  </span>
                ` : ''}
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private _renderActionPanel() {
    if (!this._actionPanelVisible || !this._actionPanelItem?.actions) {
      return html``;
    }

    return html`
      <div
        class="action-panel"
        style="top: ${this._actionPanelPosition.top}px; right: ${this._actionPanelPosition.right}px;"
        @click=${(e: MouseEvent) => e.stopPropagation()}
      >
        ${this._actionPanelItem.actions.map(action => html`
          <div class="action-item" @click=${() => this._executeAction(action)}>
            ${action.icon ? html`
              <span class="action-icon">${action.icon}</span>
            ` : ''}
            <span class="action-text">${action.title}</span>
            ${action.shortcut ? html`
              <span class="action-shortcut">${action.shortcut}</span>
            ` : ''}
          </div>
        `)}
      </div>
    `;
  }

  render() {
    return html`
      <div class="list-container" @click=${this._hideActionPanel}>
        ${this._renderSearchInput()}
        
        ${this.isLoading ? 
          this._renderLoadingSkeleton() :
          this._filteredItems.length > 0 ?
            this._filteredItems.map((item, index) => this._renderItem(item, index)) :
            this._renderEmptyState()
        }
      </div>
      
      ${this._renderActionPanel()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fc-list': FCList;
  }
}