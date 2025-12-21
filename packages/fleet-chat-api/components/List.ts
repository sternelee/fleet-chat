/**
 * List Component
 * 
 * Raycast-compatible List component built with Lit
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

@customElement('fc-list')
export class FCList extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }

    .list-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .search-bar {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--background-color);
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--input-background);
      color: var(--text-color);
      font-size: 14px;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--accent-color);
    }

    .list-items {
      flex: 1;
      overflow-y: auto;
    }

    .list-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .list-item:hover {
      background-color: var(--hover-background);
    }

    .list-item.selected {
      background-color: var(--selected-background);
    }

    .item-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--icon-background);
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-weight: 500;
      color: var(--text-color);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtitle {
      font-size: 12px;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-accessories {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
    }

    .item-accessory {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--accessory-background);
      color: var(--accessory-text-color);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--secondary-text-color);
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .empty-message {
      font-size: 14px;
      line-height: 1.4;
    }
  `;

  @property({ type: Array })
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    accessories?: Array<{ text: string; tag?: string }>;
    keywords?: string[];
    actions?: any[];
  }> = [];

  @property({ type: String })
  searchBarPlaceholder = 'Search...';

  @property({ type: Boolean })
  filtering = true;

  @property({ type: String })
  navigationTitle = '';

  @property({ type: Number })
  selectedIndex = -1;

  @property({ type: String })
  filter = '';

  @property({ type: Array })
  actions: any[] = [];

  private filteredItems: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    accessories?: Array<{ text: string; tag?: string }>;
    keywords?: string[];
    actions?: any[];
  }> = [];

  static get Item() {
    return FCListItem;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('items') || changedProperties.has('filter')) {
      this.updateFilteredItems();
    }
  }

  updateFilteredItems() {
    if (!this.filtering || !this.filter) {
      this.filteredItems = this.items;
      return;
    }

    const filterLower = this.filter.toLowerCase();
    this.filteredItems = this.items.filter(item => {
      const searchText = `${item.title} ${item.subtitle || ''} ${(item.keywords || []).join(' ')}`.toLowerCase();
      return searchText.includes(filterLower);
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredItems.length) {
          this.selectItem(this.filteredItems[this.selectedIndex]);
        }
        break;
    }
  }

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filter = target.value;
    this.selectedIndex = 0;
  }

  private selectItem(item: any) {
    this.dispatchEvent(new CustomEvent('item-selected', {
      detail: item,
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="list-container">
        ${this.filtering ? html`
          <div class="search-bar">
            <input
              type="text"
              class="search-input"
              placeholder="${this.searchBarPlaceholder}"
              value="${this.filter}"
              @input="${this.handleSearchInput}"
            />
          </div>
        ` : ''}
        
        <div class="list-items">
          ${this.filteredItems.length > 0 ? html`
            ${repeat(this.filteredItems, (item) => item.id, (item, _index) => html`
              <fc-list-item
                .item="${item}"
                .selected="${_index === this.selectedIndex}"
                @click="${() => this.selectItem(item)}"
              ></fc-list-item>
            `)}
          ` : html`
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <div class="empty-title">No Results</div>
              <div class="empty-message">Try adjusting your search terms</div>
            </div>
          `}
        </div>
      </div>
    `;
  }
}

@customElement('fc-list-item')
export class FCListItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .list-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .list-item:hover {
      background-color: var(--hover-background);
    }

    .list-item.selected {
      background-color: var(--selected-background);
    }
  `;

  @property({ type: Object })
  item: any = {};

  @property({ type: Boolean })
  selected = false;

  render() {
    const { title, subtitle, icon, accessories = [] } = this.item;

    return html`
      <div class="list-item ${this.selected ? 'selected' : ''}" @click="${this.handleClick}">
        ${icon ? html`
          <div class="item-icon">${icon}</div>
        ` : ''}
        
        <div class="item-content">
          <div class="item-title">${title}</div>
          ${subtitle ? html`
            <div class="item-subtitle">${subtitle}</div>
          ` : ''}
        </div>

        ${accessories.length > 0 ? html`
          <div class="item-accessories">
            ${repeat(accessories, (accessory: { text: string; tag?: string }) => html`
              <div class="item-accessory">${accessory.text}</div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private handleClick() {
    this.dispatchEvent(new CustomEvent('item-click', {
      detail: this.item,
      bubbles: true,
      composed: true
    }));
  }
}

export default FCList;