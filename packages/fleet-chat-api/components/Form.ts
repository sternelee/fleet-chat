/**
 * Fleet Chat Form Component
 *
 * Raycast-compatible Form component built with Lit
 */

import { LitElement, html, css, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface FormFieldProps {
  id: string;
  label?: string;
  type: "text" | "password" | "email" | "number" | "textarea" | "checkbox" | "dropdown";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  options?: Array<{ title: string; value: string }>;
  help?: string;
  onChange?: (value: any) => void;
}

export interface FormProps {
  actions?: TemplateResult;
  children?: TemplateResult[];
  onSubmit?: (values: Record<string, any>) => void;
  validate?: (values: Record<string, any>) => Record<string, string> | null;
}

@customElement("fleet-form")
export class FCForm extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      background: var(--background, white);
      border-radius: 8px;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border, #e5e5e5);
    }
  `;

  @property({ type: Object })
  actions?: TemplateResult;

  @property({ type: Array })
  children: TemplateResult[] = [];

  @property({ type: Function })
  onSubmit?: (values: Record<string, any>) => void;

  @property({ type: Function })
  validate?: (values: Record<string, any>) => Record<string, string> | null;

  @state()
  private formData: Record<string, any> = {};

  @state()
  private errors: Record<string, string> = {};

  private handleSubmit() {
    // Validate form if validate function is provided
    if (this.validate) {
      const validationErrors = this.validate(this.formData);
      if (validationErrors) {
        this.errors = validationErrors;
        this.requestUpdate();
        return;
      }
    }

    // Clear errors on successful validation
    this.errors = {};

    // Call onSubmit if provided
    if (this.onSubmit) {
      this.onSubmit(this.formData);
    }
  }

  private updateFieldValue(id: string, value: any) {
    this.formData = { ...this.formData, [id]: value };

    // Clear error for this field when value changes
    if (this.errors[id]) {
      const newErrors = { ...this.errors };
      delete newErrors[id];
      this.errors = newErrors;
    }

    this.requestUpdate();
  }

  render() {
    return html`
      <div class="form" @submit=${this.handleSubmit}>
        ${this.children.map((child) => {
          // Clone the child to pass form context
          if (child && child.values && child.values.length > 0) {
            // This is a simplified approach to handle form fields
            return html`
              <div class="form-field-wrapper" data-field-id="${child.values[0]?.id || ""}">
                ${child}
              </div>
            `;
          }
          return child;
        })}
        ${this.actions ? html` <div class="form-actions">${this.actions}</div> ` : ""}
      </div>
    `;
  }
}

@customElement("fleet-form-field")
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

    .field-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text, #333);
    }

    .field-required {
      color: var(--error, #dc3545);
      margin-left: 2px;
    }

    .field-input,
    .field-textarea,
    .field-select {
      padding: 8px 12px;
      border: 1px solid var(--border, #d0d0d0);
      border-radius: 6px;
      font-size: 14px;
      background: var(--input-background, white);
      color: var(--text, #333);
      transition: border-color 0.15s ease;
    }

    .field-input:focus,
    .field-textarea:focus,
    .field-select:focus {
      outline: none;
      border-color: var(--primary, #007aff);
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
    }

    .field-input.error,
    .field-textarea.error,
    .field-select.error {
      border-color: var(--error, #dc3545);
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
    }

    .field-checkbox-input {
      width: 16px;
      height: 16px;
      margin: 0;
    }

    .field-help {
      font-size: 12px;
      color: var(--text-secondary, #666);
      margin-top: 4px;
    }

    .field-error {
      font-size: 12px;
      color: var(--error, #dc3545);
      margin-top: 4px;
    }
  `;

  @property({ type: String })
  id!: string;

  @property({ type: String })
  label?: string;

  @property({ type: String })
  type: "text" | "password" | "email" | "number" | "textarea" | "checkbox" | "dropdown" = "text";

  @property({ type: String })
  placeholder?: string;

  @property({ type: String })
  defaultValue?: string | number | boolean;

  @property({ type: Boolean })
  required = false;

  @property({ type: Array })
  options?: Array<{ title: string; value: string }>;

  @property({ type: String })
  help?: string;

  @property({ type: String })
  error?: string;

  @property({ type: Function })
  onChange?: (value: any) => void;

  @property({ type: String })
  value?: string | number | boolean;

  private handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let value: any;

    if (this.type === "checkbox") {
      value = (target as HTMLInputElement).checked;
    } else if (this.type === "number") {
      value = Number((target as HTMLInputElement).value);
    } else {
      value = target.value;
    }

    this.value = value;

    if (this.onChange) {
      this.onChange(value);
    }

    // Dispatch event for parent form
    this.dispatchEvent(
      new CustomEvent("field-change", {
        detail: { id: this.id, value },
        bubbles: true,
      }),
    );
  }

  render() {
    const fieldValue = this.value ?? this.defaultValue ?? (this.type === "checkbox" ? false : "");

    return html`
      <div class="field-container">
        ${this.label
          ? html`
              <label class="field-label" for="${this.id}">
                ${this.label} ${this.required ? html`<span class="field-required">*</span>` : ""}
              </label>
            `
          : ""}
        ${this.type === "textarea"
          ? html`
              <textarea
                class="field-textarea ${this.error ? "error" : ""}"
                id="${this.id}"
                placeholder="${this.placeholder || ""}"
                .value="${String(fieldValue)}"
                ?required=${this.required}
                @input=${this.handleInputChange}
              ></textarea>
            `
          : this.type === "checkbox"
            ? html`
                <div class="field-checkbox">
                  <input
                    class="field-checkbox-input"
                    type="checkbox"
                    id="${this.id}"
                    .checked="${Boolean(fieldValue)}"
                    @change=${this.handleInputChange}
                  />
                  <label for="${this.id}">${this.placeholder || "Check this option"}</label>
                </div>
              `
            : this.type === "dropdown"
              ? html`
                  <select
                    class="field-select ${this.error ? "error" : ""}"
                    id="${this.id}"
                    .value="${String(fieldValue)}"
                    ?required=${this.required}
                    @change=${this.handleInputChange}
                  >
                    ${this.options?.map(
                      (option) => html` <option value="${option.value}">${option.title}</option> `,
                    )}
                  </select>
                `
              : html`
                  <input
                    class="field-input ${this.error ? "error" : ""}"
                    type="${this.type}"
                    id="${this.id}"
                    placeholder="${this.placeholder || ""}"
                    .value="${String(fieldValue)}"
                    ?required=${this.required}
                    @input=${this.handleInputChange}
                  />
                `}
        ${this.help ? html`<div class="field-help">${this.help}</div>` : ""}
        ${this.error ? html`<div class="field-error">${this.error}</div>` : ""}
      </div>
    `;
  }
}

@customElement("fleet-form-textarea")
export class FCFormTextarea extends FCFormField {
  constructor() {
    super();
    this.type = "textarea";
  }
}

@customElement("fleet-form-checkbox")
export class FCFormCheckbox extends FCFormField {
  constructor() {
    super();
    this.type = "checkbox";
  }
}

@customElement("fleet-form-dropdown")
export class FCFormDropdown extends FCFormField {
  constructor() {
    super();
    this.type = "dropdown";
  }
}

// Type definitions for external use
export interface FormFieldProps {
  id: string;
  label?: string;
  type: "text" | "password" | "email" | "number" | "textarea" | "checkbox" | "dropdown";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  options?: Array<{ title: string; value: string }>;
  help?: string;
  error?: string;
  value?: string | number | boolean;
  onChange?: (value: any) => void;
}

// Raycast-compatible exports
export const Form = FCForm;
export const FormField = FCFormField;
export const Textarea = FCFormTextarea;
export const Checkbox = FCFormCheckbox;
export const Dropdown = FCFormDropdown;

// Add displayName for debugging
(FCForm as any).displayName = "Form";
(FCFormField as any).displayName = "FormField";
(FCFormTextarea as any).displayName = "Textarea";
(FCFormCheckbox as any).displayName = "Checkbox";
(FCFormDropdown as any).displayName = "Dropdown";

