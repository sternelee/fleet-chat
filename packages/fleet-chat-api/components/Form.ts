/**
 * Fleet Chat Form Component
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
  onChange?: (value: any) => void
  onValidate?: (value: any) => string | null
}

export interface FormProps {
  actions?: TemplateResult
  children?: TemplateResult[]
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
  validate?: (values: Record<string, any>) => Record<string, string> | null
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

@customElement('fleet-form')
export class FCForm extends LitElement {
  @property({ attribute: false })
  private formChildren: TemplateResult[] = []

  set children(value: TemplateResult[]) {
    this.formChildren = value
    this.requestUpdate()
  }

  get children(): TemplateResult[] {
    return this.formChildren
  }

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
  onSubmit?: (values: Record<string, any>) => void | Promise<void>

  @property({ type: Function })
  validate?: (values: Record<string, any>) => Record<string, string> | null

  @property({ type: String })
  title?: string

  @property({ type: String })
  description?: string

  @state()
  private formData: Record<string, any> = {}

  @state()
  private errors: Record<string, string> = {}

  @state()
  private isSubmitting = false

  private fieldValidators: Map<string, (value: any) => string | null> = new Map()

  registerFieldValidator(id: string, validator: (value: any) => string | null) {
    this.fieldValidators.set(id, validator)
  }

  unregisterFieldValidator(id: string) {
    this.fieldValidators.delete(id)
  }

  private async handleSubmit() {
    if (this.isSubmitting) return

    // Validate all fields
    const validationErrors: Record<string, string> = {}

    // Run individual field validators
    this.fieldValidators.forEach((validator, fieldId) => {
      const error = validator(this.formData[fieldId])
      if (error) {
        validationErrors[fieldId] = error
      }
    })

    // Run form-level validation if provided
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

    // Clear errors on successful validation
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

  private updateFieldValue(id: string, value: any) {
    this.formData = { ...this.formData, [id]: value }

    // Clear error for this field when value changes
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

        ${this.formChildren.map((child) => child)}

        ${this.actions ? html` <div class="form-actions">${this.actions}</div> ` : ''}
        ${this.isSubmitting ? html`<div class="submit-spinner"></div>` : ''}
      </form>
    `
  }
}

@customElement('fleet-form-field')
export class FCFormField extends LitElement {
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

    .field-input.error:focus,
    .field-textarea.error:focus,
    .field-select.error:focus,
    .field-date.error:focus {
      box-shadow: 0 0 0 3px var(--color-error-alpha);
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

    .field-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
      border: none;
    }

    .field-slider-value {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }

    .field-file {
      border: 2px dashed var(--color-border);
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .field-file:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-alpha);
    }

    .field-file.dragover {
      border-color: var(--color-primary);
      background: var(--color-primary-alpha);
    }

    .field-file-input {
      display: none;
    }

    .field-file-label {
      cursor: pointer;
    }

    .field-file-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .field-file-text {
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .field-file-name {
      font-size: 12px;
      color: var(--color-primary);
      margin-top: 4px;
    }

    /* Radio Group */
    .field-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-radio {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .field-radio-input {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
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
  onChange?: (value: any) => void

  @property({ type: Function })
  onValidate?: (value: any) => string | null

  @property({ type: String })
  value?: string | number | boolean

  @property({ type: Boolean })
  disabled = false

  connectedCallback() {
    super.connectedCallback()
    // Register validator with parent form
    const form = this.closest('fleet-form') as FCForm
    if (form && this.onValidate) {
      form.registerFieldValidator(this.id, this.onValidate)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Unregister validator from parent form
    const form = this.closest('fleet-form') as FCForm
    if (form) {
      form.unregisterFieldValidator(this.id)
    }
  }

  private handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    let value: any

    switch (this.type) {
      case 'checkbox':
        value = (target as HTMLInputElement).checked
        break
      case 'number':
      case 'slider':
        value = Number((target as HTMLInputElement).value)
        break
      case 'file':
        value = (target as HTMLInputElement).files
        break
      default:
        value = target.value
    }

    this.value = value

    if (this.onChange) {
      this.onChange(value)
    }

    // Dispatch event for parent form
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
                    : this.type === 'file'
                      ? html`
                          <div class="field-file">
                            <input
                              class="field-file-input"
                              type="file"
                              id="${this.id}"
                              accept="${this.accept || ''}"
                              ?multiple=${this.multiple}
                              ?disabled=${this.disabled}
                              @change=${this.handleInputChange}
                            />
                            <label class="field-file-label" for="${this.id}">
                              <div class="field-file-icon">📁</div>
                              <div class="field-file-text">
                                ${this.placeholder || 'Choose a file or drag it here'}
                              </div>
                            </label>
                          </div>
                        `
                      : this.type === 'radio'
                        ? html`
                          <div class="field-radio-group">
                            ${this.options?.map(
                              (option, index) => html`
                              <label class="field-radio">
                                <input
                                  class="field-radio-input"
                                  type="radio"
                                  name="${this.id}"
                                  value="${option.value}"
                                  .checked="${fieldValue === option.value}"
                                  ?disabled=${this.disabled}
                                  @change=${this.handleInputChange}
                                />
                                ${option.title}
                              </label>
                            `,
                            )}
                          </div>
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

@customElement('fleet-form-textarea')
export class FCFormTextarea extends FCFormField {
  constructor() {
    super()
    this.type = 'textarea'
  }
}

@customElement('fleet-form-checkbox')
export class FCFormCheckbox extends FCFormField {
  constructor() {
    super()
    this.type = 'checkbox'
  }
}

@customElement('fleet-form-dropdown')
export class FCFormDropdown extends FCFormField {
  constructor() {
    super()
    this.type = 'dropdown'
  }
}

@customElement('fleet-form-date')
export class FCFormDate extends FCFormField {
  constructor() {
    super()
    this.type = 'date'
  }
}

@customElement('fleet-form-file')
export class FCFormFile extends FCFormField {
  constructor() {
    super()
    this.type = 'file'
  }
}

@customElement('fleet-form-slider')
export class FCFormSlider extends FCFormField {
  constructor() {
    super()
    this.type = 'slider'
  }
}

@customElement('fleet-form-radio')
export class FCFormRadio extends FCFormField {
  constructor() {
    super()
    this.type = 'radio'
  }
}

// Type definitions for external use
export type { FormFieldProps, FormProps }

// Raycast-compatible exports
export const Form = FCForm
export const FormField = FCFormField
export const Textarea = FCFormTextarea
export const Checkbox = FCFormCheckbox
export const Dropdown = FCFormDropdown
export const DateField = FCFormDate
export const FileField = FCFormFile
export const Slider = FCFormSlider
export const Radio = FCFormRadio

// Add displayName for debugging
;(FCForm as any).displayName = 'Form'
;(FCFormField as any).displayName = 'FormField'
;(FCFormTextarea as any).displayName = 'Textarea'
;(FCFormCheckbox as any).displayName = 'Checkbox'
;(FCFormDropdown as any).displayName = 'Dropdown'
;(FCFormDate as any).displayName = 'DateField'
;(FCFormFile as any).displayName = 'FileField'
;(FCFormSlider as any).displayName = 'Slider'
;(FCFormRadio as any).displayName = 'Radio'
