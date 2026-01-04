/**
 * Grid Component
 *
 * Raycast-compatible Grid component built with Lit
 */

import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'

export interface IconProps {
  source: string
  tintColor?: string
  tooltip?: string
}

export interface GridItemProps {
  id: string
  title: string
  subtitle?: string
  text?: string
  image?: string
  icon?: string | IconProps
  actions?: GridActionProps[]
  aspectRatio?: number
  content?: string
}

export interface GridActionProps {
  title: string
  icon?: string | IconProps
  onAction?: () => void | Promise<void>
  style?: 'default' | 'destructive'
}

export type GridSize = 'small' | 'medium' | 'large'
export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

@customElement('fc-grid')
export class Grid extends LitElement {
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

    /* Search Bar */
    .search-bar {
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-background);
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-input-background);
      color: var(--color-text-primary);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--color-primary);
    }

    /* Grid Items */
    .grid-items {
      flex: 1;
      padding: 12px;
      display: grid;
      gap: 12px;
      overflow-y: auto;
    }

    /* Grid size variants */
    .grid-items.size-small {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }

    .grid-items.size-medium {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .grid-items.size-large {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    /* Fixed columns */
    .grid-items.columns-1 { grid-template-columns: repeat(1, 1fr); }
    .grid-items.columns-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-items.columns-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-items.columns-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-items.columns-5 { grid-template-columns: repeat(5, 1fr); }
    .grid-items.columns-6 { grid-template-columns: repeat(6, 1fr); }
    .grid-items.columns-7 { grid-template-columns: repeat(7, 1fr); }
    .grid-items.columns-8 { grid-template-columns: repeat(8, 1fr); }

    /* Grid Item */
    .grid-item {
      background: var(--color-item-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .grid-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--color-primary);
    }

    .grid-item.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }

    .grid-item-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      background: var(--color-image-placeholder);
    }

    .grid-item-icon {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      background: var(--color-icon-background);
      color: var(--color-icon);
    }

    .grid-item-icon img,
    .grid-item-icon svg {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }

    .grid-item-content {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .grid-item-title {
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 4px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .grid-item-subtitle {
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .grid-item-text {
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px;
    }

    .grid-item-actions {
      padding: 8px 12px;
      border-top: 1px solid var(--color-border);
      background: var(--color-actions-background);
      display: flex;
      gap: 8px;
    }

    .grid-action {
      flex: 1;
      padding: 6px 8px;
      border: none;
      border-radius: 4px;
      background: var(--color-primary);
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .grid-action:hover {
      background: var(--color-primary-hover);
    }

    .grid-action.destructive {
      background: var(--color-error);
    }

    .grid-action.destructive:hover {
      background: var(--color-error-hover);
    }

    .grid-action-icon {
      width: 12px;
      height: 12px;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--color-text-secondary);
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

    /* Loading State */
    .loading-skeleton {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      padding: 12px;
    }

    .skeleton-item {
      background: var(--color-item-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .skeleton-image {
      aspect-ratio: 1;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    .skeleton-content {
      padding: 12px;
    }

    .skeleton-title {
      height: 16px;
      width: 80%;
      margin-bottom: 8px;
      border-radius: 3px;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    .skeleton-subtitle {
      height: 12px;
      width: 60%;
      border-radius: 3px;
      background: var(--color-skeleton);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `

  @property({ type: Array })
  items: GridItemProps[] = []

  @property({ type: String })
  searchBarPlaceholder = 'Search...'

  @property({ type: Boolean })
  filtering = true

  @property({ type: String })
  size: GridSize = 'medium'

  @property({ type: Number })
  columns?: GridColumns

  @property({ type: Number })
  aspectRatio = 1

  @property({ type: String })
  filter = ''

  @property({ type: Number })
  selectedIndex = -1

  @property({ type: Boolean })
  isLoading = false

  @property({ type: Boolean })
  navigation = true

  private filteredItems: GridItemProps[] = []

  static get Item() {
    return GridItem
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('items') || changedProperties.has('filter')) {
      this.updateFilteredItems()
    }
  }

  updateFilteredItems() {
    if (!this.filtering || !this.filter) {
      this.filteredItems = this.items
      return
    }

    const filterLower = this.filter.toLowerCase()
    this.filteredItems = this.items.filter((item) => {
      const searchText = `${item.title} ${item.subtitle || ''} ${item.text || ''}`.toLowerCase()
      return searchText.includes(filterLower)
    })
  }

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement
    this.filter = target.value
  }

  private selectItem(item: GridItemProps) {
    this.dispatchEvent(
      new CustomEvent('item-selected', {
        detail: item,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.navigation) return

    const totalItems = this.filteredItems.length

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, totalItems - 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
        break
      case 'Enter':
        event.preventDefault()
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredItems.length) {
          this.selectItem(this.filteredItems[this.selectedIndex])
        }
        break
    }
  }

  private getGridClassName(): string {
    if (this.columns) {
      return `grid-items columns-${this.columns}`
    }
    return `grid-items size-${this.size}`
  }

  render() {
    return html`
      <div class="grid-container" @keydown="${this.handleKeyDown}">
        ${
          this.filtering
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
            : ''
        }

        ${
          this.isLoading
            ? this.renderLoadingSkeleton()
            : html`
              <div class="${this.getGridClassName()}">
                ${
                  this.filteredItems.length > 0
                    ? html`
                      ${repeat(
                        this.filteredItems,
                        (item) => item.id,
                        (item, index) => html`
                          <fc-grid-item
                            .item="${item}"
                            .selected="${index === this.selectedIndex}"
                            .aspectRatio="${this.aspectRatio}"
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
                    `
                }
              </div>
            `
        }
      </div>
    `
  }

  private renderLoadingSkeleton() {
    return html`
      <div class="loading-skeleton">
        ${Array.from(
          { length: 8 },
          () => html`
          <div class="skeleton-item">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-subtitle"></div>
            </div>
          </div>
        `,
        )}
      </div>
    `
  }
}

@customElement('fc-grid-item')
export class GridItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .grid-item {
      background: var(--color-item-background);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .grid-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--color-primary);
    }

    .grid-item.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }
  `

  @property({ type: Object })
  item!: GridItemProps

  @property({ type: Boolean })
  selected = false

  @property({ type: Number })
  aspectRatio = 1

  private renderIcon(icon: string | IconProps | undefined) {
    if (!icon) return html``

    const iconSrc = typeof icon === 'string' ? icon : icon.source
    const iconTint = typeof icon === 'object' && icon.tintColor ? `color: ${icon.tintColor}` : ''

    if (iconSrc.startsWith('http') || iconSrc.startsWith('/')) {
      return html`<img src="${iconSrc}" alt="" style="${iconTint}" />`
    }

    if (iconSrc.startsWith('<svg')) {
      return html`<div style="${iconTint}">${iconSrc}</div>`
    }

    return html`<span style="${iconTint}">${iconSrc}</span>`
  }

  private handleAction(action: GridActionProps, event: Event) {
    event.preventDefault()
    event.stopPropagation()

    if (action.onAction) {
      action.onAction()
    }
  }

  render() {
    const { title, subtitle, text, image, icon, actions } = this.item

    return html`
      <div
        class="grid-item ${this.selected ? 'selected' : ''}"
        style="${this.aspectRatio ? `--aspect-ratio: ${this.aspectRatio}` : ''}"
        @click="${(e: Event) => {
          e.stopPropagation()
          this.dispatchEvent(
            new CustomEvent('item-click', {
              detail: this.item,
              bubbles: true,
              composed: true,
            }),
          )
        }}"
      >
        ${
          image
            ? html` <img src="${image}" alt="${title}" class="grid-item-image" style="aspect-ratio: ${this.aspectRatio}" /> `
            : icon
              ? html`
                <div class="grid-item-icon">
                  ${this.renderIcon(icon)}
                </div>
              `
              : ''
        }

        <div class="grid-item-content">
          <div class="grid-item-title">${title}</div>
          ${subtitle ? html` <div class="grid-item-subtitle">${subtitle}</div> ` : ''}
          ${text ? html` <div class="grid-item-text">${text}</div> ` : ''}
        </div>

        ${
          actions && actions.length > 0
            ? html`
          <div class="grid-item-actions">
            ${actions.map(
              (action) => html`
              <button
                class="grid-action ${action.style === 'destructive' ? 'destructive' : ''}"
                @click="${(e: Event) => this.handleAction(action, e)}"
              >
                ${action.icon ? html`<span class="grid-action-icon">${this.renderIcon(action.icon)}</span>` : ''}
                ${action.title}
              </button>
            `,
            )}
          </div>
        `
            : ''
        }
      </div>
    `
  }
}

export default Grid

export { Grid as FCGrid, GridItem as FCGridItem }
