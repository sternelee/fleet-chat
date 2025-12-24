/**
 * Fleet Chat Icon Component
 *
 * Raycast-compatible Icon component supporting multiple icon types
 */

import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export type IconType = 'emoji' | 'image' | 'symbol' | 'lucide' | 'text'

export interface IconProps {
  // Icon source - can be:
  // - Emoji string: "🚀"
  // - Image URL: "https://example.com/icon.png"
  // - SF Symbol: "house.fill"
  // - Lucide icon name: "house"
  // - Text initials: "AB"
  source: string

  // Icon type (auto-detected if not specified)
  type?: IconType

  // Icon size
  size?: number

  // Icon color (for text/symbol icons)
  color?: string

  // Icon background
  backgroundColor?: string

  // Alt text for accessibility
  alt?: string

  // Fallback icon if source fails to load
  fallback?: string
}

/**
 * Icon utilities
 */
export class IconUtils {
  /**
   * Auto-detect icon type from source
   */
  static detectIconType(source: string): IconType {
    // Check for emoji (most common unicode emojis are in specific ranges)
    if (
      /[\u{1F600}-\u{1F64F}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
        source,
      )
    ) {
      return 'emoji'
    }

    // Check for URL
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('/')) {
      return 'image'
    }

    // Check for SF Symbol (typically with dot notation)
    if (source.includes('.')) {
      return 'symbol'
    }

    // Check for known icon libraries
    const knownIcons = [
      'house',
      'home',
      'settings',
      'search',
      'user',
      'folder',
      'file',
      'chevron-right',
      'chevron-down',
      'chevron-up',
      'chevron-left',
      'plus',
      'minus',
      'check',
      'x',
      'heart',
      'star',
      'moon',
      'sun',
      // ... add more as needed
    ]

    if (knownIcons.includes(source.toLowerCase())) {
      return 'lucide'
    }

    // Default to text (initials)
    return 'text'
  }

  /**
   * Get initials from a string
   */
  static getInitials(text: string, maxLength: number = 2): string {
    const words = text.trim().split(/\s+/)
    if (words.length === 0) return '?'

    if (words.length === 1) {
      return words[0].substring(0, maxLength).toUpperCase()
    }

    return words
      .slice(0, maxLength)
      .map((word) => word[0].toUpperCase())
      .join('')
  }

  /**
   * Get color for initials (based on string hash)
   */
  static getInitialsColor(text: string): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B500',
      '#52C7B8',
    ]

    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }
}

@customElement('fc-icon')
export class FCIcon extends LitElement {
  @property({ type: String })
  source!: string

  @property({ type: String })
  type?: IconType

  @property({ type: Number })
  size: number = 32

  @property({ type: String })
  color?: string

  @property({ type: String })
  backgroundColor?: string

  @property({ type: String })
  alt?: string

  @property({ type: String })
  fallback?: string

  @property({ type: Boolean })
  circle: boolean = false

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon {
      width: var(--icon-size, 32px);
      height: var(--icon-size, 32px);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: var(--icon-radius, 6px);
      background: var(--icon-background);
      color: var(--icon-color);
      font-size: calc(var(--icon-size, 32px) * 0.5);
      overflow: hidden;
      position: relative;
    }

    .icon.circle {
      border-radius: 50%;
    }

    .icon img,
    .icon svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .icon-text {
      font-weight: 600;
      text-transform: uppercase;
    }

    .icon.emoji {
      font-size: var(--icon-size, 32px);
      background: transparent;
    }

    /* SF Symbol support */
    .icon-symbol {
      -webkit-appearance: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Lucide icons */
    .icon-lucide svg {
      width: 100%;
      height: 100%;
      stroke-width: 2;
      stroke: currentColor;
    }

    /* Fallback state */
    .icon.loading {
      background: var(--color-skeleton, #2c2c2e);
    }

    .icon.error {
      background: var(--color-error, #ff3b30);
      color: #ffffff;
    }
  `

  private _getEffectiveType(): IconType {
    return this.type || IconUtils.detectIconType(this.source)
  }

  private _renderEmoji() {
    return html`
      <div class="icon emoji">
        ${this.source}
      </div>
    `
  }

  private _renderImage() {
    return html`
      <div class="icon image">
        <img
          src="${this.source}"
          alt="${this.alt || 'Icon'}"
          @error=${this._handleImageError}
        />
      </div>
    `
  }

  private _handleImageError() {
    if (this.fallback) {
      // Re-render with fallback
      this.source = this.fallback
      this.requestUpdate()
    }
  }

  private _renderSymbol() {
    // SF Symbol for macOS - uses system icon font
    return html`
      <div class="icon symbol" style="font-family: system-ui; -apple-symbol: true;">
        ${this._getSymbolSVG(this.source)}
      </div>
    `
  }

  private _getSymbolSVG(symbolName: string) {
    // Simple SVG placeholders for common symbols
    const symbolIcons: Record<string, string> = {
      'house.fill': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-6h5l-7-7-7 7h5v6z"/></svg>`,
      house: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11h-6v-6h-6v6H3z"/></svg>`,
      gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.3-10.7l-4.2 4.2m0 8.5l4.2 4.2M23 12h-6m-6 0H5m10.7 5.3l-4.2-4.2m0 8.5l4.2 4.2"/></svg>`,
      'gearshape.fill': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10 0-5.523-4.477-10-10-10zm0 18c-4.411 0-8-3.589-8-8 0-4.411 3.589-8 8-8 4.411 0 8 3.589 8 8 0 4.411-3.589 8-8 8zm0-14c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6-6-2.691-6-6 2.691-6 6-6 2.691-6 6-6 6 2.691 6 6-2.691 6-6z"/></svg>`,
      // Add more symbols as needed
    }

    return symbolIcons[symbolName] || this._renderLucideIcon(symbolName)
  }

  private _renderLucide() {
    // Lucide icon - using a simple icon set
    return html`
      <div class="icon lucide">
        ${this._getLucideSVG(this.source)}
      </div>
    `
  }

  private _getLucideSVG(iconName: string) {
    // Lucide icons - simplified set
    const lucideIcons: Record<string, string> = {
      house: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11h-6v-6h-6v6H3z"/></svg>`,
      home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11h-6v-6h-6v6H3z"/></svg>`,
      search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
      settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.3-10.7l-4.2 4.2m0 8.5l4.2 4.2M23 12h-6m-6 0H5m10.7 5.3l-4.2-4.2m0 8.5l4.2 4.2"/></svg>`,
      user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
      file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      'chevron-right': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
      'chevron-down': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
      'chevron-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
      'chevron-left': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
      plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>`,
      moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
      sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    }

    return lucideIcons[iconName] || this._renderTextIcon(iconName)
  }

  private _renderTextIcon() {
    const initials = IconUtils.getInitials(this.source)
    const bgColor = this.backgroundColor || IconUtils.getInitialsColor(this.source)

    return html`
      <div
        class="icon text"
        style="
          --icon-size: ${this.size}px;
          --icon-background: ${bgColor};
          --icon-color: ${this.color || IconUtils.getContrastColor(bgColor)};
        "
      >
        <span class="icon-text">${initials}</span>
      </div>
    `
  }

  private _renderText() {
    return this._renderTextIcon()
  }

  render() {
    const type = this._getEffectiveType()
    const effectiveSize = this.size
    const borderRadius = this.circle ? '50%' : '6px'

    let iconRender: ReturnType<(typeof FCIcon)['_renderEmoji']>

    switch (type) {
      case 'emoji':
        iconRender = this._renderEmoji()
        break
      case 'image':
        iconRender = this._renderImage()
        break
      case 'symbol':
        iconRender = this._renderSymbol()
        break
      case 'lucide':
        iconRender = this._renderLucide()
        break
      case 'text':
      default:
        iconRender = this._renderText()
        break
    }

    return html`
      <div
        class="icon ${this.circle ? 'circle' : ''}"
        style="
          --icon-size: ${effectiveSize}px;
          --icon-radius: ${borderRadius};
          ${this.color ? `--icon-color: ${this.color};` : ''}
          ${this.backgroundColor ? `--icon-background: ${this.backgroundColor};` : ''}
        "
      >
        ${iconRender}
      </div>
    `
  }
}

/**
 * Icon.Symbol sub-component for SF Symbols
 */
@customElement('fc-icon-symbol')
export class FCIconSymbol extends FCIcon {
  constructor() {
    super()
    this.type = 'symbol'
  }
}

/**
 * Icon.Image sub-component for image URLs
 */
@customElement('fc-icon-image')
export class FCIconImage extends FCIcon {
  constructor() {
    super()
    this.type = 'image'
  }
}

/**
 * Icon.Text sub-component for text/initials
 */
@customElement('fc-icon-text')
export class FCIconText extends FCIcon {
  constructor() {
    super()
    this.type = 'text'
  }
}

// Re-export IconUtils for external use
export { IconUtils }

// Export for Raycast compatibility
export const Icon = FCIcon
export type {
  IconSymbol,
  IconImage,
  IconText,

  // Add displayName for debugging
}
;(FCIcon as any).displayName = 'Icon'
;(FCIconSymbol as any).displayName = 'Icon.Symbol'
;(FCIconImage as any).displayName = 'Icon.Image'
;(FCIconText as any).displayName = 'Icon.Text'
