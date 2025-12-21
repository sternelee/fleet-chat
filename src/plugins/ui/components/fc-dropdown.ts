/**
 * FCDropdown - Fleet Chat Dropdown Component
 * Raycast-compatible dropdown component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface DropdownOption {
  value: string;
  title: string;
  icon?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}

@customElement("fc-dropdown")
export class FCDropdown extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .dropdown-container {
      position: relative;
      width: 100%;
    }

    .dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background);
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 36px;
      user-select: none;
    }

    .dropdown-trigger:hover:not(.disabled) {
      border-color: var(--color-primary);
    }

    .dropdown-trigger.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--color-disabled-background);
    }

    .dropdown-trigger.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }

    .dropdown-value {
      flex: 1;
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-placeholder {
      color: var(--color-text-secondary);
      font-style: italic;
    }

    .dropdown-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease;
    }

    .dropdown-trigger.active .dropdown-icon {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-panel-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-height: 300px;
      overflow-y: auto;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.15s ease;
      margin-top: 4px;
    }

    .dropdown-menu.active {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-search {
      padding: 8px;
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      background: var(--color-panel-background);
    }

    .dropdown-search-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: var(--font-size-sm);
      background: var(--color-background);
      color: var(--color-text-primary);
      outline: none;
    }

    .dropdown-search-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }

    .dropdown-option {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      gap: 8px;
      min-height: 32px;
      user-select: none;
    }

    .dropdown-option:hover:not(.disabled) {
      background: var(--color-item-hover);
    }

    .dropdown-option.selected {
      background: var(--color-primary-alpha);
      color: var(--color-primary);
    }

    .dropdown-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dropdown-option-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .dropdown-option-text {
      flex: 1;
      font-size: var(--font-size-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-option-check {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: var(--color-primary);
    }

    .no-results {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-style: italic;
    }
  `;

  @property({ type: Array })
  options: DropdownOption[] = [];

  @property({ type: String })
  value?: string;

  @property({ type: String })
  placeholder?: string = "Select an option...";

  @property({ type: Boolean })
  disabled: boolean = false;

  @property({ type: Boolean })
  searchable: boolean = false;

  @property({ type: Function })
  onValueChange?: (value: string) => void;

  @state()
  private isOpen: boolean = false;

  @state()
  private searchTerm: string = "";

  @state()
  private filteredOptions: DropdownOption[] = [];

  private triggerRef: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.filteredOptions = this.options;
    document.addEventListener("click", this.handleDocumentClick);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick);
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has("options")) {
      this.updateFilteredOptions();
    }
  }

  private handleDocumentClick = (event: Event) => {
    if (!this.contains(event.target as Node)) {
      this.close();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.isOpen && event.key === "Escape") {
      this.close();
      event.preventDefault();
    }
  };

  private updateFilteredOptions() {
    if (!this.searchTerm) {
      this.filteredOptions = this.options;
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredOptions = this.options.filter(
        (option) =>
          option.title.toLowerCase().includes(searchLower) ||
          option.value.toLowerCase().includes(searchLower),
      );
    }
  }

  private open() {
    if (this.disabled) return;

    this.isOpen = true;
    this.searchTerm = "";
    this.updateFilteredOptions();
  }

  private close() {
    this.isOpen = false;
    this.searchTerm = "";
    this.updateFilteredOptions();
  }

  private toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private selectOption(option: DropdownOption) {
    if (option.disabled) return;

    this.value = option.value;
    this.close();

    if (this.onValueChange) {
      this.onValueChange(option.value);
    }

    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: option.value, option },
      }),
    );
  }

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.updateFilteredOptions();
  }

  private getSelectedTitle(): string {
    if (!this.value) return this.placeholder!;

    const selectedOption = this.options.find((opt) => opt.value === this.value);
    return selectedOption ? selectedOption.title : this.placeholder!;
  }

  private getSelectedIcon(): string | undefined {
    if (!this.value) return undefined;

    const selectedOption = this.options.find((opt) => opt.value === this.value);
    return selectedOption ? selectedOption.icon : undefined;
  }

  private renderSearch() {
    if (!this.searchable) return "";

    return html`
      <div class="dropdown-search">
        <input
          type="text"
          class="dropdown-search-input"
          placeholder="Search options..."
          .value=${this.searchTerm}
          @input=${this.handleSearchInput}
          @click=${(e: Event) => e.stopPropagation()}
        />
      </div>
    `;
  }

  private renderOptions() {
    if (this.filteredOptions.length === 0) {
      return html` <div class="no-results">No options found</div> `;
    }

    return this.filteredOptions.map((option) => {
      const isSelected = option.value === this.value;

      return html`
        <div
          class="dropdown-option ${isSelected ? "selected" : ""} ${option.disabled
            ? "disabled"
            : ""}"
          @click=${() => this.selectOption(option)}
          role="option"
          aria-selected="${isSelected}"
          aria-disabled="${option.disabled}"
        >
          ${option.icon ? html` <div class="dropdown-option-icon">${option.icon}</div> ` : ""}

          <div class="dropdown-option-text">${option.title}</div>

          ${isSelected ? html` <div class="dropdown-option-check">✓</div> ` : ""}
        </div>
      `;
    });
  }

  render() {
    const selectedIcon = this.getSelectedIcon();
    const selectedTitle = this.getSelectedTitle();
    const showPlaceholder = !this.value;

    return html`
      <div class="dropdown-container">
        <div
          class="dropdown-trigger ${this.disabled ? "disabled" : ""} ${this.isOpen ? "active" : ""}"
          @click=${this.toggle}
          role="combobox"
          aria-expanded="${this.isOpen}"
          aria-haspopup="listbox"
          aria-disabled="${this.disabled}"
          tabindex="${this.disabled ? -1 : 0}"
        >
          <div class="dropdown-value ${showPlaceholder ? "dropdown-placeholder" : ""}">
            ${selectedIcon ? html` <span style="margin-right: 8px;">${selectedIcon}</span> ` : ""}
            ${selectedTitle}
          </div>

          <div class="dropdown-icon">▼</div>
        </div>

        <div class="dropdown-menu ${this.isOpen ? "active" : ""}" role="listbox">
          ${this.renderSearch()} ${this.renderOptions()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fc-dropdown": FCDropdown;
  }
}

