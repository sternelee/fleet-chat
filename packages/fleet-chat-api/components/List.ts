/**
 * FCList - Fleet Chat List Component
 * Raycast-compatible List component built with Lit
 */

import { LitElement, html, css, PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

export interface ListItemProps {
  id: string
  title: string
  subtitle?: string
  icon?: string | IconProps
  accessories?: ListAccessory[]
  actions?: ListAction[]
  keywords?: string[]
  alwaysShowTitle?: boolean
}

export interface IconProps {
  source: string
  tintColor?: string
  tooltip?: string
}

export interface ListAccessory {
  text?: string
  icon?: string | IconProps
  tooltip?: string
  tag?: {
    value: string
    color?: string
  }
  date?: Date
  progress?: number
  link?: {
    title?: string
    target?: string
    text?: string
  }
}

export interface ListAction {
  title: string
  icon?: string | IconProps
  shortcut?: string
  onAction: () => void | Promise<void>
  style?: 'default' | 'destructive'
}

export interface ListSectionProps {
  title?: string
  subtitle?: string
  items?: ListItemProps[]
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

    /* List Section */
    .list-section {
      margin-bottom: 16px;
    }

    .section-header {
      padding: 8px 12px 4px;
    }

    .section-title {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }

    .section-subtitle {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    /* List Item */
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
      position: relative;
    }

    .list-item:hover {
      background: var(--color-item-hover);
    }

    .list-item.selected {
      background: var(--color-item-selected);
    }

    .list-item.dragging {
      opacity: 0.5;
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
      overflow: hidden;
    }

    .item-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 6px;
    }

    .item-icon svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
    }

    .item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .item-title {
      font-weight: 500;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .item-subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .item-accessories {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
      flex-shrink: 0;
    }

    .accessory {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .accessory-icon {
      width: 12px;
      height: 12px;
      opacity: 0.7;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .accessory-icon img,
    .accessory-icon svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .accessory-text {
      font-size: 12px;
    }

    .accessory-tag {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: var(--font-size-xs);
      font-weight: 500;
      background: var(--color-tag-background);
      color: var(--color-tag-text);
      white-space: nowrap;
    }

    .accessory-date {
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-secondary);
    }

    .accessory-link {
      font-size: 12px;
      color: var(--color-primary);
      text-decoration: none;
    }

    .accessory-link:hover {
      text-decoration: underline;
    }

    /* Progress Bar Accessory */
    .accessory-progress {
      width: 60px;
      height: 4px;
      background: var(--color-progress-background);
      border-radius: 2px;
      overflow: hidden;
    }

    .accessory-progress-bar {
      height: 100%;
      background: var(--color-primary);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    /* Empty State */
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

    /* Loading State */
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
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Action Panel */
    .action-panel {
      position: fixed;
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
      gap: 8px;
    }

    .action-item:hover {
      background: var(--color-item-hover);
    }

    .action-item.destructive {
      color: var(--color-error);
    }

    .action-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-text {
      flex: 1;
      font-size: var(--font-size-sm);
    }

    .action-shortcut {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      font-family: var(--font-family-mono);
      background: var(--color-badge-background);
      padding: 2px 6px;
      border-radius: 4px;
    }
  `

  @property({ type: Array })
  items: ListItemProps[] = []

  @property({ type: Array })
  sections: ListSectionProps[] = []

  @property({ type: String })
  searchPlaceholder: string = 'Search...'

  @property({ type: Boolean })
  isLoading: boolean = false

  @property({ type: Boolean })
  enableSearch: boolean = true

  @property({ type: Boolean })
  showSectionTitles: boolean = true

  @property({ type: String })
  emptyStateTitle: string = 'No Items'

  @property({ type: String })
  emptyStateDescription: string = ''

  @property({ type: String })
  emptyStateIcon: string = '📋'

  @property({ type: Boolean })
  navigation: boolean = true

  @state()
  private _selectedIndex = 0

  @state()
  private _searchQuery = ''

  @state()
  private _filteredItems: ListItemProps[] = []

  @state()
  private _filteredSections: ListSectionProps[] = []

  @state()
  private _actionPanelVisible = false

  @state()
  private _actionPanelItem: ListItemProps | null = null

  @state()
  private _actionPanelPosition = { top: 0, left: 0 }

  protected firstUpdated() {
    this._filterItems()
    this.addEventListener('keydown', this._handleKeydown)
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has('items') ||
      changedProps.has('sections') ||
      changedProps.has('_searchQuery')
    ) {
      this._filterItems()
    }
  }

  private _filterItems() {
    if (!this._searchQuery) {
      this._filteredItems = [...this.items]
      this._filteredSections = this.sections.map((section) => ({
        ...section,
        items: section.items ? [...section.items] : [],
      }))
    } else {
      const query = this._searchQuery.toLowerCase()

      this._filteredItems = this.items.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(query)
        const subtitleMatch = item.subtitle?.toLowerCase().includes(query) ?? false
        const keywordsMatch =
          item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) ?? false

        return titleMatch || subtitleMatch || keywordsMatch
      })

      this._filteredSections = this.sections
        .map((section) => ({
          ...section,
          items:
            section.items?.filter((item) => {
              const titleMatch = item.title.toLowerCase().includes(query)
              const subtitleMatch = item.subtitle?.toLowerCase().includes(query) ?? false
              const keywordsMatch =
                item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) ?? false
              return titleMatch || subtitleMatch || keywordsMatch
            }) ?? [],
        }))
        .filter((section) => section.items && section.items.length > 0)
    }

    // Reset selection if out of bounds
    const totalItems = this._getTotalItemCount()
    if (this._selectedIndex >= totalItems) {
      this._selectedIndex = Math.max(0, totalItems - 1)
    }
  }

  private _getTotalItemCount(): number {
    return (
      this._filteredItems.length +
      this._filteredSections.reduce((acc, section) => acc + (section.items?.length ?? 0), 0)
    )
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    if (!this.navigation) return

    const totalItems = this._getTotalItemCount()

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this._selectedIndex = Math.min(this._selectedIndex + 1, totalItems - 1)
        this._scrollToSelected()
        break

      case 'ArrowUp':
        event.preventDefault()
        this._selectedIndex = Math.max(0, this._selectedIndex - 1)
        this._scrollToSelected()
        break

      case 'Enter':
        event.preventDefault()
        this._selectByIndex(this._selectedIndex)
        break

      case 'Escape':
        this._hideActionPanel()
        break
    }
  }

  private _scrollToSelected() {
    const items = this.shadowRoot?.querySelectorAll('.list-item')
    if (items && items[this._selectedIndex]) {
      ;(items[this._selectedIndex] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }

  private _selectByIndex(index: number) {
    const flatItems = this._getFlatItems()
    if (flatItems[index]) {
      this._selectItem(flatItems[index])
    }
  }

  private _getFlatItems(): ListItemProps[] {
    const items: ListItemProps[] = []
    items.push(...this._filteredItems)
    this._filteredSections.forEach((section) => {
      if (section.items) {
        items.push(...section.items)
      }
    })
    return items
  }

  private _selectItem(item: ListItemProps) {
    this.dispatchEvent(
      new CustomEvent('itemSelected', {
        detail: { item },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private _showActionPanel(item: ListItemProps, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

    this._actionPanelItem = item
    this._actionPanelPosition = {
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 220),
    }
    this._actionPanelVisible = true
  }

  private _hideActionPanel() {
    this._actionPanelVisible = false
    this._actionPanelItem = null
  }

  private _executeAction(action: ListAction) {
    try {
      action.onAction()
    } catch (error) {
      console.error('Error executing action:', error)
    }
    this._hideActionPanel()
  }

  private _renderIcon(icon: string | IconProps | undefined, size: 'small' | 'normal' = 'normal') {
    if (!icon) return html``

    const iconSize = size === 'small' ? '12px' : '32px'
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

  private _renderAccessory(accessory: ListAccessory) {
    return html`
      <div class="accessory" title="${accessory.tooltip || ''}">
        ${
          accessory.icon
            ? html`
          <div class="accessory-icon">
            ${this._renderIcon(accessory.icon, 'small')}
          </div>
        `
            : ''
        }
        ${accessory.text ? html` <span class="accessory-text">${accessory.text}</span> ` : ''}
        ${
          accessory.date
            ? html`
          <span class="accessory-date">${this._formatDate(accessory.date)}</span>
        `
            : ''
        }
        ${
          accessory.progress !== undefined
            ? html`
          <div class="accessory-progress">
            <div class="accessory-progress-bar" style="width: ${accessory.progress}%"></div>
          </div>
        `
            : ''
        }
        ${
          accessory.tag
            ? html`
          <span class="accessory-tag" style="${accessory.tag.color ? `background: ${accessory.tag.color};` : ''}">
            ${accessory.tag.value}
          </span>
        `
            : ''
        }
        ${
          accessory.link
            ? html`
          <a class="accessory-link" href="${accessory.link.target || '#'}" title="${accessory.link.title || ''}">
            ${accessory.link.text || accessory.link.title || 'Link'}
          </a>
        `
            : ''
        }
      </div>
    `
  }

  private _formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? 'now' : `${minutes}m ago`
      }
      return `${hours}h ago`
    }
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  private _renderSearchInput() {
    if (!this.enableSearch) return html``

    return html`
      <div class="search-container">
        <input
          type="text"
          class="search-input"
          placeholder=${this.searchPlaceholder}
          value=${this._searchQuery}
          @input=${(e: InputEvent) => {
            this._searchQuery = (e.target as HTMLInputElement).value
          }}
        />
      </div>
    `
  }

  private _renderLoadingSkeleton() {
    return html`
      ${Array.from(
        { length: 5 },
        () => html`
          <div class="loading-skeleton">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-subtitle"></div>
            </div>
          </div>
        `,
      )}
    `
  }

  private _renderEmptyState() {
    return html`
      <div class="empty-state">
        <div class="empty-icon">${this.emptyStateIcon}</div>
        <div class="empty-title">${this.emptyStateTitle}</div>
        <div class="empty-description">${this.emptyStateDescription}</div>
      </div>
    `
  }

  private _renderItem(item: ListItemProps, index: number) {
    const globalIndex = this._filteredItems.length > 0 ? index : this._getGlobalSectionIndex(index)

    const isSelected = globalIndex === this._selectedIndex

    return html`
      <div
        class="list-item ${isSelected ? 'selected' : ''}"
        data-index="${globalIndex}"
        @click=${() => {
          this._selectedIndex = globalIndex
          this._selectItem(item)
        }}
        @contextmenu=${(e: MouseEvent) => (item.actions ? this._showActionPanel(item, e) : null)}
      >
        ${
          item.icon
            ? html`
              <div class="item-icon">
                ${this._renderIcon(item.icon)}
              </div>
            `
            : ''
        }

        <div class="item-content">
          <div class="item-title">${item.title}</div>
          ${item.subtitle ? html` <div class="item-subtitle">${item.subtitle}</div> ` : ''}
        </div>

        ${
          item.accessories && item.accessories.length > 0
            ? html`
              <div class="item-accessories">
                ${item.accessories.map((accessory) => this._renderAccessory(accessory))}
              </div>
            `
            : ''
        }
      </div>
    `
  }

  private _getGlobalSectionIndex(sectionIndex: number, itemIndex?: number): number {
    let globalIndex = this._filteredItems.length
    for (let i = 0; i < sectionIndex; i++) {
      globalIndex += this._filteredSections[i]?.items?.length ?? 0
    }
    return globalIndex + (itemIndex ?? 0)
  }

  private _renderSection(section: ListSectionProps, sectionIndex: number) {
    if (!section.items || section.items.length === 0) return html``

    return html`
      <div class="list-section">
        ${
          this.showSectionTitles && (section.title || section.subtitle)
            ? html`
          <div class="section-header">
            ${section.title ? html`<div class="section-title">${section.title}</div>` : ''}
            ${section.subtitle ? html`<div class="section-subtitle">${section.subtitle}</div>` : ''}
          </div>
        `
            : ''
        }
        ${section.items.map((item, itemIndex) => {
          const globalIndex = this._getGlobalSectionIndex(sectionIndex, itemIndex)
          return this._renderItem(item, globalIndex)
        })}
      </div>
    `
  }

  private _renderActionPanel() {
    if (!this._actionPanelVisible || !this._actionPanelItem?.actions) {
      return html``
    }

    return html`
      <div
        class="action-panel"
        style="top: ${this._actionPanelPosition.top}px; left: ${this._actionPanelPosition.left}px;"
        @click=${(e: MouseEvent) => e.stopPropagation()}
      >
        ${this._actionPanelItem.actions.map(
          (action) => html`
            <div
              class="action-item ${action.style === 'destructive' ? 'destructive' : ''}"
              @click=${() => this._executeAction(action)}
            >
              ${
                action.icon
                  ? html`
                <div class="action-icon">
                  ${this._renderIcon(action.icon, 'small')}
                </div>
              `
                  : ''
              }
              <span class="action-text">${action.title}</span>
              ${
                action.shortcut
                  ? html` <span class="action-shortcut">${action.shortcut}</span> `
                  : ''
              }
            </div>
          `,
        )}
      </div>
    `
  }

  render() {
    const hasSections = this._filteredSections.length > 0
    const hasItems = this._filteredItems.length > 0
    const hasContent = hasSections || hasItems

    return html`
      <div class="list-container" @click=${this._hideActionPanel}>
        ${this._renderSearchInput()}
        ${
          this.isLoading
            ? this._renderLoadingSkeleton()
            : hasContent
              ? html`
                ${hasItems ? this._filteredItems.map((item, index) => this._renderItem(item, index)) : ''}
                ${hasSections ? this._filteredSections.map((section, index) => this._renderSection(section, index)) : ''}
              `
              : this._renderEmptyState()
        }
      </div>

      ${this._renderActionPanel()}
    `
  }
}

/**
 * List.Item sub-component
 */
@customElement('fc-list-item')
export class FCListItem extends LitElement {
  @property({ type: Object })
  item!: ListItemProps

  @property({ type: Boolean })
  selected = false

  @property({ type: Number })
  index = 0

  static styles = css`
    :host {
      display: block;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

/**
 * List.Section sub-component
 */
@customElement('fc-list-section')
export class FCListSection extends LitElement {
  @property({ type: Object })
  section!: ListSectionProps

  @property({ type: Boolean })
  showTitle = true

  static styles = css`
    :host {
      display: block;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fc-list': FCList
    'fc-list-item': FCListItem
    'fc-list-section': FCListSection
  }
}

// Export for Raycast compatibility
export const List = FCList
export const ListItem = FCListItem
export const ListSection = FCListSection
