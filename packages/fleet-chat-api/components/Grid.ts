/**
 * Grid Component
 *
 * Raycast-compatible Grid component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("fc-grid")
export class FCGrid extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }

    .grid-container {
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

    .grid-items {
      flex: 1;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--item-width, 200px), 1fr));
      gap: 12px;
      overflow-y: auto;
    }

    .grid-item {
      background: var(--item-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s ease;
      aspect-ratio: var(--aspect-ratio, 1/1);
      display: flex;
      flex-direction: column;
    }

    .grid-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .grid-item.selected {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-color);
    }

    .grid-item-content {
      flex: 1;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .item-image {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .item-icon {
      font-size: 48px;
      margin-bottom: 8px;
      opacity: 0.8;
    }

    .item-title {
      font-weight: 500;
      color: var(--text-color);
      margin-bottom: 4px;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .item-subtitle {
      font-size: 12px;
      color: var(--secondary-text-color);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .item-actions {
      padding: 8px 12px;
      border-top: 1px solid var(--border-color);
      background: var(--action-background);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .action-button {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      background: var(--accent-color);
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .action-button:hover {
      background: var(--accent-hover-color);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--secondary-text-color);
      text-align: center;
      grid-column: 1 / -1;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 12px;
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
    image?: string;
    icon?: string;
    actions?: any[];
    aspectRatio?: number;
  }> = [];

  @property({ type: String })
  searchBarPlaceholder = "Search...";

  @property({ type: Boolean })
  filtering = true;

  @property({ type: Number })
  itemSize = { width: 200, height: 200 };

  @property({ type: Number })
  aspectRatio = 1;

  @property({ type: String })
  filter = "";

  @property({ type: Number })
  selectedIndex = -1;

  @property({ type: Array })
  actions: any[] = [];

  private filteredItems: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    icon?: string;
    actions?: any[];
    aspectRatio?: number;
  }> = [];

  static get Item() {
    return FCGridItem;
  }

  connectedCallback() {
    super.connectedCallback();
    this.style.setProperty("--item-width", `${this.itemSize.width}px`);
    this.style.setProperty("--aspect-ratio", this.aspectRatio.toString());
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has("items") || changedProperties.has("filter")) {
      this.updateFilteredItems();
    }
    if (changedProperties.has("itemSize")) {
      this.style.setProperty("--item-width", `${this.itemSize.width}px`);
    }
    if (changedProperties.has("aspectRatio")) {
      this.style.setProperty("--aspect-ratio", this.aspectRatio.toString());
    }
  }

  updateFilteredItems() {
    if (!this.filtering || !this.filter) {
      this.filteredItems = this.items;
      return;
    }

    const filterLower = this.filter.toLowerCase();
    this.filteredItems = this.items.filter((item) => {
      const searchText = `${item.title} ${item.subtitle || ""}`.toLowerCase();
      return searchText.includes(filterLower);
    });
  }

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filter = target.value;
  }

  private selectItem(item: any) {
    this.dispatchEvent(
      new CustomEvent("item-selected", {
        detail: item,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        break;
      case "Enter":
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredItems.length) {
          this.selectItem(this.filteredItems[this.selectedIndex]);
        }
        break;
    }
  }

  render() {
    return html`
      <div class="grid-container" @keydown="${this.handleKeyDown}">
        ${this.filtering
          ? html`
              <div class="search-bar">
                <input
                  type="text"
                  class="search-input"
                  placeholder="${this.searchBarPlaceholder}"
                  value="${this.filter}"
                  @input="${this.handleSearchInput}"
                />
              </div>
            `
          : ""}

        <div class="grid-items">
          ${this.filteredItems.length > 0
            ? html`
                ${repeat(
                  this.filteredItems,
                  (item) => item.id,
                  (item, _index) => html`
                    <fc-grid-item
                      .item="${item}"
                      .selected="${_index === this.selectedIndex}"
                      @click="${() => this.selectItem(item)}"
                    ></fc-grid-item>
                  `,
                )}
              `
            : html`
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

@customElement("fc-grid-item")
export class FCGridItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .grid-item {
      background: var(--item-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s ease;
      aspect-ratio: var(--aspect-ratio, 1/1);
      display: flex;
      flex-direction: column;
    }

    .grid-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .grid-item.selected {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-color);
    }
  `;

  @property({ type: Object })
  item: any = {};

  @property({ type: Boolean })
  selected = false;

  render() {
    const { title, subtitle, image, icon } = this.item;

    return html`
      <div class="grid-item ${this.selected ? "selected" : ""}" @click="${this.handleClick}">
        <div class="grid-item-content">
          ${image
            ? html` <img src="${image}" alt="${title}" class="item-image" /> `
            : icon
              ? html` <div class="item-icon">${icon}</div> `
              : ""}

          <div class="item-title">${title}</div>
          ${subtitle ? html` <div class="item-subtitle">${subtitle}</div> ` : ""}
        </div>
      </div>
    `;
  }

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent("item-click", {
        detail: this.item,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

export default FCGrid;
