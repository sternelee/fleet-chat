/**
 * Form Component
 *
 * Raycast-compatible Form component built with Lit
 */

import { css, html, LitElement, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

export interface IconProps {
  source: string
  tintColor?: string
  tooltip?: string
}

export interface FormFieldProps {
  id: string
  label?: string
  type:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'dropdown'
    | 'date'
    | 'file'
    | 'slider'
    | 'radio'
  placeholder?: string
  defaultValue?: string | number | boolean
  required?: boolean
  options?: Array<{ title: string; value: string }>
  help?: string
  error?: string
  icon?: string | IconProps
  min?: number
  max?: number
  step?: number
  accept?: string
  multiple?: boolean
  rows?: number
  onChange?: (value: unknown) => void
  onValidate?: (value: unknown) => string | null
}

export interface FormProps {
  actions?: TemplateResult
  children?: TemplateResult[]
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>
  validate?: (values: Record<string, unknown>) => Record<string, string> | null
}

@customElement('fc-form')
export class Form extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      background: var(--color-background, white);
      border-radius: 8px;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .form-description {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border, #e5e5e5);
    }

    .form-submitting {
      position: relative;
      pointer-events: none;
    }

    .form-submitting::after {
      content: "";
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .submit-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border);
      border-top: 2px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `

  @property({ type: Object })
  actions?: TemplateResult

  @property({ type: Function })
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>

  @property({ type: Function })
  validate?: (values: Record<string, unknown>) => Record<string, string> | null

  @property({ type: String })
  title?: string

  @property({ type: String })
  description?: string

  @state()
  private formData: Record<string, unknown> = {}

  @state()
  private errors: Record<string, string> = {}

  @state()
  private isSubmitting = false

  private fieldValidators: Map<string, (value: unknown) => string | null> = new Map()

  registerFieldValidator(id: string, validator: (value: unknown) => string | null) {
    this.fieldValidators.set(id, validator)
  }

  unregisterFieldValidator(id: string) {
    this.fieldValidators.delete(id)
  }

  private async handleSubmit() {
    if (this.isSubmitting) return

    const validationErrors: Record<string, string> = {}

    this.fieldValidators.forEach((validator, fieldId) => {
      const error = validator(this.formData[fieldId])
      if (error) {
        validationErrors[fieldId] = error
      }
    })

    if (this.validate) {
      const formErrors = this.validate(this.formData)
      if (formErrors) {
        Object.assign(validationErrors, formErrors)
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      this.errors = validationErrors
      this.requestUpdate()
      return
    }

    this.errors = {}
    this.isSubmitting = true

    try {
      if (this.onSubmit) {
        await Promise.resolve(this.onSubmit(this.formData))
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      this.isSubmitting = false
    }
  }

  private updateFieldValue(id: string, value: unknown) {
    this.formData = { ...this.formData, [id]: value }

    if (this.errors[id]) {
      const newErrors = { ...this.errors }
      delete newErrors[id]
      this.errors = newErrors
    }

    this.requestUpdate()
  }

  private handleFieldChange(event: CustomEvent) {
    const { id, value } = event.detail
    this.updateFieldValue(id, value)
  }

  render() {
    return html`
      <form
        class="form ${this.isSubmitting ? 'form-submitting' : ''}"
        @submit=${(e: Event) => {
          e.preventDefault()
          this.handleSubmit()
        }}
        @field-change=${this.handleFieldChange}
      >
        ${this.title ? html`<div class="form-title">${this.title}</div>` : ''}
        ${this.description ? html`<div class="form-description">${this.description}</div>` : ''}

        <slot></slot>

        ${this.actions ? html` <div class="form-actions">${this.actions}</div> ` : ''}
        ${this.isSubmitting ? html`<div class="submit-spinner"></div>` : ''}
      </form>
    `
  }
}

@customElement('fc-form-field')
export class FormField extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .field-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .field-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-text-primary);
    }

    .field-icon {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
    }

    .field-required {
      color: var(--color-error);
      margin-left: 2px;
    }

    .field-input,
    .field-textarea,
    .field-select,
    .field-date {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 14px;
      background: var(--color-input-background);
      color: var(--color-text-primary);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      width: 100%;
    }

    .field-input:focus,
    .field-textarea:focus,
    .field-select:focus,
    .field-date:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-alpha);
    }

    .field-input.error,
    .field-textarea.error,
    .field-select.error,
    .field-date.error {
      border-color: var(--color-error);
    }

    .field-textarea {
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
    }

    .field-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      cursor: pointer;
    }

    .field-checkbox-input {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
    }

    .field-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--color-slider-background);
      outline: none;
      -webkit-appearance: none;
    }

    .field-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }

    .field-slider-value {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }

    .field-help {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }

    .field-error {
      font-size: 12px;
      color: var(--color-error);
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .field-error-icon {
      width: 12px;
      height: 12px;
    }
  `

  @property({ type: String })
  id!: string

  @property({ type: String })
  label?: string

  @property({ type: String })
  type:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'dropdown'
    | 'date'
    | 'file'
    | 'slider'
    | 'radio' = 'text'

  @property({ type: String })
  placeholder?: string

  @property({ type: String })
  defaultValue?: string | number | boolean

  @property({ type: Boolean })
  required = false

  @property({ type: Array })
  options?: Array<{ title: string; value: string }>

  @property({ type: String })
  help?: string

  @property({ type: String })
  error?: string

  @property({ type: String })
  icon?: string | IconProps

  @property({ type: Number })
  min?: number

  @property({ type: Number })
  max?: number

  @property({ type: Number })
  step?: number

  @property({ type: String })
  accept?: string

  @property({ type: Boolean })
  multiple = false

  @property({ type: Number })
  rows = 3

  @property({ type: Function })
  onChange?: (value: unknown) => void

  @property({ type: Function })
  onValidate?: (value: unknown) => string | null

  @property({ type: String })
  value?: string | number | boolean

  @property({ type: Boolean })
  disabled = false

  connectedCallback() {
    super.connectedCallback()
    const form = this.closest('fc-form') as Form
    if (form && this.onValidate) {
      form.registerFieldValidator(this.id, this.onValidate)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    const form = this.closest('fc-form') as Form
    if (form) {
      form.unregisterFieldValidator(this.id)
    }
  }

  private handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    let value: unknown

    switch (this.type) {
      case 'checkbox':
        value = (target as HTMLInputElement).checked
        break
      case 'number':
      case 'slider':
        value = Number((target as HTMLInputElement).value)
        break
      default:
        value = target.value
    }

    this.value = value

    if (this.onChange) {
      this.onChange(value)
    }

    this.dispatchEvent(
      new CustomEvent('field-change', {
        detail: { id: this.id, value },
        bubbles: true,
      }),
    )
  }

  private renderIcon(icon: string | IconProps | undefined) {
    if (!icon) return html``

    const iconSrc = typeof icon === 'string' ? icon : icon.source
    const iconTint = typeof icon === 'object' && icon.tintColor ? `color: ${icon.tintColor}` : ''

    if (iconSrc.startsWith('http') || iconSrc.startsWith('/')) {
      return html`<img src="${iconSrc}" alt="" style="width: 100%; height: 100%; object-fit: contain; ${iconTint}" />`
    }

    return html`<span style="${iconTint}">${iconSrc}</span>`
  }

  render() {
    const fieldValue = this.value ?? this.defaultValue ?? (this.type === 'checkbox' ? false : '')
    const displayError = this.error

    return html`
      <div class="field-container">
        ${
          this.label
            ? html`
              <div class="field-header">
                ${this.icon ? html`<div class="field-icon">${this.renderIcon(this.icon)}</div>` : ''}
                <label class="field-label" for="${this.id}">
                  ${this.label} ${this.required ? html`<span class="field-required">*</span>` : ''}
                </label>
              </div>
            `
            : ''
        }

        ${
          this.type === 'textarea'
            ? html`
              <textarea
                class="field-textarea ${displayError ? 'error' : ''}"
                id="${this.id}"
                placeholder="${this.placeholder || ''}"
                .value="${String(fieldValue)}"
                rows="${this.rows}"
                ?required=${this.required}
                ?disabled=${this.disabled}
                @input=${this.handleInputChange}
              ></textarea>
            `
            : this.type === 'checkbox'
              ? html`
                  <label class="field-checkbox">
                    <input
                      class="field-checkbox-input"
                      type="checkbox"
                      id="${this.id}"
                      .checked="${Boolean(fieldValue)}"
                      ?disabled=${this.disabled}
                      @change=${this.handleInputChange}
                    />
                    ${this.placeholder || 'Check this option'}
                  </label>
                `
              : this.type === 'dropdown'
                ? html`
                    <select
                      class="field-select ${displayError ? 'error' : ''}"
                      id="${this.id}"
                      .value="${String(fieldValue)}"
                      ?required=${this.required}
                      ?disabled=${this.disabled}
                      @change=${this.handleInputChange}
                    >
                      ${this.options?.map(
                        (option) =>
                          html` <option value="${option.value}">${option.title}</option> `,
                      )}
                    </select>
                  `
                : this.type === 'date'
                  ? html`
                      <input
                        class="field-date ${displayError ? 'error' : ''}"
                        type="date"
                        id="${this.id}"
                        .value="${String(fieldValue)}"
                        ?required=${this.required}
                        ?disabled=${this.disabled}
                        @change=${this.handleInputChange}
                      />
                    `
                  : this.type === 'slider'
                    ? html`
                        <input
                          class="field-slider"
                          type="range"
                          id="${this.id}"
                          .value="${Number(fieldValue)}"
                          min="${this.min ?? 0}"
                          max="${this.max ?? 100}"
                          step="${this.step ?? 1}"
                          ?disabled=${this.disabled}
                          @input=${this.handleInputChange}
                        />
                        <div class="field-slider-value">${fieldValue}</div>
                      `
                    : html`
                        <input
                          class="field-input ${displayError ? 'error' : ''}"
                          type="${this.type}"
                          id="${this.id}"
                          placeholder="${this.placeholder || ''}"
                          .value="${String(fieldValue)}"
                          ?required=${this.required}
                          ?disabled=${this.disabled}
                          @input=${this.handleInputChange}
                        />
                      `
        }

        ${this.help ? html`<div class="field-help">${this.help}</div>` : ''}
        ${
          displayError
            ? html`
          <div class="field-error">
            <span class="field-error-icon">⚠</span>
            ${displayError}
          </div>
        `
            : ''
        }
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fc-form': Form
    'fc-form-field': FormField
  }
}

export { Form as FCForm, FormField as FCFormField }
