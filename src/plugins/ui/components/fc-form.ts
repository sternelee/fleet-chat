/**
 * FCForm - Fleet Chat Form Component
 * Raycast-compatible Form component built with Lit
 */

import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface FormFieldProps {
  id: string;
  type: "textfield" | "textarea" | "checkbox" | "dropdown" | "password";
  label: string;
  placeholder?: string;
  required?: boolean;
  default?: string | boolean;
  options?: Array<{ value: string; title: string }>;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => string | null;
  };
}

export interface FormActionProps {
  id: string;
  title: string;
  type?: "submit" | "cancel";
  onAction?: (values: Record<string, any>) => void | Promise<void>;
  disabled?: boolean;
}

@customElement("fc-form")
export class FCForm extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background: var(--color-background);
      color: var(--color-text-primary);
      font-family: var(--font-family-system);
    }

    .form-container {
      padding: 24px;
    }

    .form-header {
      margin-bottom: 24px;
    }

    .form-title {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .form-description {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      line-height: 1.5;
    }

    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 24px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-field-label {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-field-required {
      color: var(--color-error);
      font-weight: 600;
    }

    .form-field-description {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      margin-top: -4px;
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      padding: 10px 12px;
      background: var(--color-input);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text-primary);
      font-size: var(--font-size-base);
      font-family: var(--font-family-system);
      outline: none;
      transition: all 0.2s ease;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-alpha);
    }

    .form-input.error,
    .form-textarea.error,
    .form-select.error {
      border-color: var(--color-error);
    }

    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }

    .form-checkbox-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-input);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .form-checkbox-container:hover {
      background: var(--color-item-hover);
    }

    .form-checkbox {
      width: 18px;
      height: 18px;
      margin: 0;
      cursor: pointer;
    }

    .form-checkbox-label {
      flex: 1;
      font-size: var(--font-size-base);
      color: var(--color-text-primary);
      cursor: pointer;
      user-select: none;
    }

    .form-error {
      font-size: var(--font-size-xs);
      color: var(--color-error);
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-error-icon {
      font-size: 12px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }

    .form-button {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: var(--font-size-base);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 100px;
      justify-content: center;
    }

    .form-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-button-primary {
      background: var(--color-primary);
      color: white;
    }

    .form-button-primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .form-button-secondary {
      background: var(--color-secondary);
      color: var(--color-text-primary);
    }

    .form-button-secondary:hover:not(:disabled) {
      background: var(--color-secondary-hover);
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .form-loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .form-group {
      padding: 16px;
      background: var(--color-panel-background);
      border-radius: 8px;
      border: 1px solid var(--color-border);
    }

    .form-group-title {
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--color-text-primary);
    }
  `;

  @property({ type: Array })
  fields: FormFieldProps[] = [];

  @property({ type: Array })
  actions: FormActionProps[] = [];

  @property({ type: String })
  title?: string;

  @property({ type: String })
  description?: string;

  @property({ type: Boolean })
  isLoading: boolean = false;

  @state()
  private formValues: Record<string, any> = {};

  @state()
  private formErrors: Record<string, string> = {};

  @state()
  private isSubmitting: boolean = false;

  protected firstUpdated() {
    this.initializeFormValues();
  }

  protected updated(changedProperties: any) {
    if (changedProperties.has("fields")) {
      this.initializeFormValues();
    }
  }

  private initializeFormValues() {
    const values: Record<string, any> = {};
    const errors: Record<string, string> = {};

    this.fields.forEach((field) => {
      values[field.id] =
        field.default !== undefined ? field.default : field.type === "checkbox" ? false : "";
      errors[field.id] = "";
    });

    this.formValues = values;
    this.formErrors = errors;
  }

  private handleInputChange(fieldId: string, value: any) {
    this.formValues[fieldId] = value;

    // Clear error for this field
    if (this.formErrors[fieldId]) {
      this.formErrors[fieldId] = "";
      this.requestUpdate();
    }

    // Validate if there's validation rules
    this.validateField(fieldId, value);
  }

  private validateField(fieldId: string, value: any): boolean {
    const field = this.fields.find((f) => f.id === fieldId);
    if (!field || !field.validation) return true;

    const { validation } = field;
    let errorMessage: string | null = null;

    // Required validation
    if (field.required && (!value || (typeof value === "string" && !value.trim()))) {
      errorMessage = "This field is required";
    }

    // Pattern validation
    if (!errorMessage && validation.pattern && typeof value === "string") {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errorMessage = "Invalid format";
      }
    }

    // Length validation
    if (!errorMessage && typeof value === "string") {
      if (validation.minLength && value.length < validation.minLength) {
        errorMessage = `Minimum ${validation.minLength} characters required`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errorMessage = `Maximum ${validation.maxLength} characters allowed`;
      }
    }

    // Number range validation
    if (!errorMessage && typeof value === "number") {
      if (validation.min !== undefined && value < validation.min) {
        errorMessage = `Minimum value is ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        errorMessage = `Maximum value is ${validation.max}`;
      }
    }

    // Custom validation
    if (!errorMessage && validation.custom) {
      errorMessage = validation.custom(value);
    }

    if (errorMessage) {
      this.formErrors[fieldId] = errorMessage;
      this.requestUpdate();
      return false;
    }

    return true;
  }

  private validateForm(): boolean {
    let isValid = true;

    this.fields.forEach((field) => {
      if (!this.validateField(field.id, this.formValues[field.id])) {
        isValid = false;
      }
    });

    return isValid;
  }

  private async handleSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.requestUpdate();

    try {
      // Find submit action
      const submitAction = this.actions.find((action) => action.type === "submit");
      if (submitAction && submitAction.onAction) {
        await submitAction.onAction(this.formValues);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      this.isSubmitting = false;
      this.requestUpdate();
    }
  }

  private async handleCancel() {
    const cancelAction = this.actions.find((action) => action.type === "cancel");
    if (cancelAction && cancelAction.onAction) {
      await cancelAction.onAction(this.formValues);
    }
  }

  private handleActionClick(action: FormActionProps) {
    if (action.type === "submit") {
      this.handleSubmit();
    } else if (action.type === "cancel") {
      this.handleCancel();
    } else if (action.onAction) {
      action.onAction(this.formValues);
    }
  }

  private renderField(field: FormFieldProps) {
    const value = this.formValues[field.id];
    const error = this.formErrors[field.id];

    switch (field.type) {
      case "textfield":
      case "password":
        return this.renderTextField(field, value, error);

      case "textarea":
        return this.renderTextArea(field, value, error);

      case "checkbox":
        return this.renderCheckbox(field, value, error);

      case "dropdown":
        return this.renderDropdown(field, value, error);

      default:
        return html``;
    }
  }

  private renderTextField(field: FormFieldProps, value: string, error: string) {
    return html`
      <div class="form-field">
        <label class="form-field-label">
          ${field.label} ${field.required ? html`<span class="form-field-required">*</span>` : ""}
        </label>

        <input
          type="${field.type}"
          class="form-input ${error ? "error" : ""}"
          placeholder="${field.placeholder || ""}"
          .value=${value || ""}
          ?disabled=${this.isLoading || this.isSubmitting}
          @input=${(e: InputEvent) =>
            this.handleInputChange(field.id, (e.target as HTMLInputElement).value)}
        />

        ${field.placeholder
          ? html` <div class="form-field-description">${field.placeholder}</div> `
          : ""}
        ${error
          ? html`
              <div class="form-error">
                <span class="form-error-icon">⚠️</span>
                ${error}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderTextArea(field: FormFieldProps, value: string, error: string) {
    return html`
      <div class="form-field">
        <label class="form-field-label">
          ${field.label} ${field.required ? html`<span class="form-field-required">*</span>` : ""}
        </label>

        <textarea
          class="form-textarea ${error ? "error" : ""}"
          placeholder="${field.placeholder || ""}"
          .value=${value || ""}
          ?disabled=${this.isLoading || this.isSubmitting}
          @input=${(e: InputEvent) =>
            this.handleInputChange(field.id, (e.target as HTMLTextAreaElement).value)}
        ></textarea>

        ${field.placeholder
          ? html` <div class="form-field-description">${field.placeholder}</div> `
          : ""}
        ${error
          ? html`
              <div class="form-error">
                <span class="form-error-icon">⚠️</span>
                ${error}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderCheckbox(field: FormFieldProps, value: boolean, error: string) {
    return html`
      <div class="form-field">
        <div class="form-checkbox-container">
          <input
            type="checkbox"
            class="form-checkbox"
            id="${field.id}"
            .checked=${value}
            ?disabled=${this.isLoading || this.isSubmitting}
            @change=${(e: Event) =>
              this.handleInputChange(field.id, (e.target as HTMLInputElement).checked)}
          />

          <label class="form-checkbox-label" for="${field.id}">
            ${field.label} ${field.required ? html`<span class="form-field-required">*</span>` : ""}
          </label>
        </div>

        ${field.placeholder
          ? html` <div class="form-field-description">${field.placeholder}</div> `
          : ""}
        ${error
          ? html`
              <div class="form-error">
                <span class="form-error-icon">⚠️</span>
                ${error}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderDropdown(field: FormFieldProps, value: string, error: string) {
    return html`
      <div class="form-field">
        <label class="form-field-label">
          ${field.label} ${field.required ? html`<span class="form-field-required">*</span>` : ""}
        </label>

        <select
          class="form-select ${error ? "error" : ""}"
          .value=${value || ""}
          ?disabled=${this.isLoading || this.isSubmitting}
          @change=${(e: Event) =>
            this.handleInputChange(field.id, (e.target as HTMLSelectElement).value)}
        >
          ${!field.required ? html`<option value="">Select an option</option>` : ""}
          ${field.options?.map(
            (option) => html`
              <option value="${option.value}" ?selected=${option.value === value}>
                ${option.title}
              </option>
            `,
          )}
        </select>

        ${field.placeholder
          ? html` <div class="form-field-description">${field.placeholder}</div> `
          : ""}
        ${error
          ? html`
              <div class="form-error">
                <span class="form-error-icon">⚠️</span>
                ${error}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private renderActions() {
    if (this.actions.length === 0) return html``;

    return html`
      <div class="form-actions">
        ${this.actions.map((action) => {
          const isLoading = this.isSubmitting && action.type === "submit";
          const isDisabled = action.disabled || this.isLoading || this.isSubmitting;

          return html`
            <button
              class="form-button ${action.type === "submit"
                ? "form-button-primary"
                : "form-button-secondary"}"
              ?disabled=${isDisabled}
              @click=${() => this.handleActionClick(action)}
            >
              ${isLoading ? html`<div class="loading-spinner"></div>` : ""} ${action.title}
            </button>
          `;
        })}
      </div>
    `;
  }

  render() {
    return html`
      <div class="form-container ${this.isLoading || this.isSubmitting ? "form-loading" : ""}">
        ${this.title || this.description
          ? html`
              <div class="form-header">
                ${this.title ? html`<div class="form-title">${this.title}</div>` : ""}
                ${this.description
                  ? html`<div class="form-description">${this.description}</div>`
                  : ""}
              </div>
            `
          : ""}

        <form
          class="form-fields"
          @submit=${(e: Event) => {
            e.preventDefault();
            this.handleSubmit();
          }}
        >
          ${this.fields.map((field) => this.renderField(field))}
        </form>

        ${this.renderActions()}
      </div>
    `;
  }

  /**
   * Get current form values
   */
  getValues(): Record<string, any> {
    return { ...this.formValues };
  }

  /**
   * Set form values
   */
  setValues(values: Record<string, any>) {
    this.formValues = { ...this.formValues, ...values };
    this.requestUpdate();
  }

  /**
   * Reset form to initial values
   */
  reset() {
    this.initializeFormValues();
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fc-form": FCForm;
  }
}

