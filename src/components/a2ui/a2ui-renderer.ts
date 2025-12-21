import { css, html, LitElement, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { repeat } from 'lit/directives/repeat.js'

// A2UI Component Types
interface A2UIComponent {
  id: string
  component: any
  weight?: number
}

interface SurfaceUpdate {
  components: A2UIComponent[]
}

interface DataModelUpdate {
  patches: DataPatch[]
}

interface DataPatch {
  path: string
  value: any
}

interface BeginRendering {
  surfaceId: string
  root: string
  styles?: Record<string, any>
}

type A2UIMessage =
  | { type: 'surfaceUpdate'; surfaceUpdate: SurfaceUpdate }
  | { type: 'dataModelUpdate'; dataModelUpdate: DataModelUpdate }
  | { type: 'beginRendering'; beginRendering: BeginRendering }
  | { type: 'deleteSurface'; deleteSurface: { surfaceId: string } }

// Data model for binding
interface DataModel {
  [key: string]: any
}

// Component registry for rendering different A2UI components
@customElement('a2ui-renderer')
export class A2UIRenderer extends LitElement {
  @property({ type: Array })
  accessor messages: A2UIMessage[] = []

  @property({ type: Object })
  accessor dataModel: DataModel = {}

  @property({ type: String })
  accessor rootComponentId: string = ''

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .surface {
      display: contents;
    }

    /* Layout Components */
    .row {
      display: flex;
      flex-direction: row;
      gap: 8px;
      align-items: center;
    }

    .row.start {
      justify-content: flex-start;
    }

    .row.center {
      justify-content: center;
    }

    .row.end {
      justify-content: flex-end;
    }

    .row.stretch {
      justify-content: stretch;
    }

    .row.space-between {
      justify-content: space-between;
    }

    .row.space-around {
      justify-content: space-around;
    }

    .row.space-evenly {
      justify-content: space-evenly;
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .column.start {
      justify-content: flex-start;
      align-items: flex-start;
    }

    .column.center {
      justify-content: center;
      align-items: center;
    }

    .column.end {
      justify-content: flex-end;
      align-items: flex-end;
    }

    .column.stretch {
      justify-content: stretch;
      align-items: stretch;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Card Component */
    .card {
      background: #ffffff;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Text Component */
    .text {
      color: #333333;
      word-wrap: break-word;
    }

    .text.h1 {
      font-size: 2.5rem;
      font-weight: 600;
      margin: 0;
    }

    .text.h2 {
      font-size: 2rem;
      font-weight: 600;
      margin: 0;
    }

    .text.h3 {
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0;
    }

    .text.h4 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .text.h5 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .text.body {
      font-size: 1rem;
      font-weight: 400;
      margin: 0;
    }

    .text.caption {
      font-size: 0.875rem;
      font-weight: 400;
      color: #666666;
      margin: 0;
    }

    /* Button Component */
    .button {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .button:hover {
      background: #0056b3;
    }

    .button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .button.primary {
      background: #007bff;
    }

    .button.secondary {
      background: #6c757d;
    }

    /* TextField Component */
    .text-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .text-field label {
      font-size: 14px;
      font-weight: 500;
      color: #333333;
    }

    .text-field input {
      border: 1px solid #ced4da;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 14px;
    }

    .text-field input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    /* Tabs Component */
    .tabs {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .tab-headers {
      display: flex;
      border-bottom: 1px solid #e1e5e9;
    }

    .tab-header {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s ease;
    }

    .tab-header.active {
      border-bottom-color: #007bff;
      color: #007bff;
    }

    .tab-content {
      padding: 16px 0;
    }

    .tab-panel {
      display: none;
    }

    .tab-panel.active {
      display: block;
    }

    /* Icon Component */
    .icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

    /* Divider Component */
    .divider {
      border: none;
      height: 1px;
      background: #e1e5e9;
      margin: 8px 0;
    }

    .divider.vertical {
      width: 1px;
      height: auto;
      margin: 0 8px;
    }

    /* Loading state */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: #666666;
    }

    /* Error state */
    .error {
      color: #dc3545;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      padding: 12px;
      border-radius: 4px;
      margin: 8px 0;
    }
  `

  // Component registry for rendering
  private components: Map<string, A2UIComponent> = new Map()

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('messages')) {
      this.processMessages()
    }
  }

  private processMessages() {
    this.components.clear()

    for (const message of this.messages) {
      switch (message.type) {
        case 'surfaceUpdate':
          message.surfaceUpdate.components.forEach((comp) => {
            this.components.set(comp.id, comp)
          })
          break
        case 'dataModelUpdate':
          message.dataModelUpdate.patches.forEach((patch) => {
            this.applyDataPatch(patch)
          })
          break
        case 'beginRendering':
          this.rootComponentId = message.beginRendering.root
          break
        case 'deleteSurface':
          // Handle surface deletion if needed
          break
      }
    }
  }

  private applyDataPatch(patch: DataPatch) {
    // Parse JSON Pointer path (RFC 6901)
    const pathParts = patch.path.split('/').slice(1) // Remove leading empty string from split

    if (pathParts.length === 0) {
      // Root path "/" - merge object properties
      if (typeof patch.value === 'object' && patch.value !== null && !Array.isArray(patch.value)) {
        this.dataModel = { ...this.dataModel, ...patch.value }
      } else {
        console.warn('Attempted to set non-object value at root path, skipping')
      }
    } else {
      // Navigate to target and set value
      this.setValueAtPath(this.dataModel, pathParts, patch.value)
      // Trigger re-render by creating a new object reference
      this.dataModel = { ...this.dataModel }
    }
  }

  private setValueAtPath(obj: any, pathParts: string[], value: any) {
    if (pathParts.length === 0) return

    if (pathParts.length === 1) {
      // Final key, set the value
      obj[pathParts[0]] = value
    } else {
      // Navigate deeper
      const key = pathParts[0]
      const remaining = pathParts.slice(1)

      // Create nested object if it doesn't exist
      if (!obj[key] || typeof obj[key] !== 'object') {
        obj[key] = {}
      }

      this.setValueAtPath(obj[key], remaining, value)
    }
  }

  // Legacy method - kept for backward compatibility but no longer used
  private updateDataModel(content: any) {
    if (content.key && content.valueMap) {
      this.dataModel = {
        ...this.dataModel,
        [content.key]: this.valueMapToObject(content.valueMap),
      }
    }
  }

  // Legacy method - kept for backward compatibility but no longer used
  private valueMapToObject(valueMap: any[]): any {
    const obj: any = {}
    valueMap.forEach((item) => {
      if (item.key !== undefined) {
        if (item.valueString !== undefined) {
          obj[item.key] = item.valueString
        } else if (item.valueNumber !== undefined) {
          obj[item.key] = item.valueNumber
        } else if (item.valueBoolean !== undefined) {
          obj[item.key] = item.valueBoolean
        } else if (item.valueMap) {
          obj[item.key] = this.valueMapToObject(item.valueMap)
        }
      }
    })
    return obj
  }

  private resolveBinding(binding: any): any {
    if (!binding) return null

    if (binding.path) {
      return this.getNestedValue(this.dataModel, binding.path)
    } else if (binding.literalString !== undefined) {
      return binding.literalString
    } else if (binding.literalNumber !== undefined) {
      return binding.literalNumber
    } else if (binding.literalBoolean !== undefined) {
      return binding.literalBoolean
    }

    return null
  }

  private getNestedValue(obj: any, path: string): any {
    return path
      .split('/')
      .slice(1)
      .reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null
      }, obj)
  }

  private handleAction(action: any, event?: Event) {
    if (!action) return

    console.log('A2UI Action:', action)

    // Create a custom event to notify parent components
    const customEvent = new CustomEvent('a2ui-action', {
      detail: {
        name: action.name,
        context: action.context || [],
        event: event,
      },
      bubbles: true,
      composed: true,
    })

    this.dispatchEvent(customEvent)
  }

  render() {
    if (!this.rootComponentId) {
      return html`<div class="loading">Loading A2UI components...</div>`
    }

    const rootComponent = this.components.get(this.rootComponentId)
    if (!rootComponent) {
      return html`<div class="error">Root component not found: ${this.rootComponentId}</div>`
    }

    return this.renderComponent(rootComponent)
  }

  private renderComponent(component: A2UIComponent) {
    const comp = component.component
    const compType = Object.keys(comp)[0]
    const compProps = comp[compType]

    switch (compType) {
      case 'Row':
        return this.renderRow(compProps, component.weight)
      case 'Column':
        return this.renderColumn(compProps, component.weight)
      case 'List':
        return this.renderList(compProps, component.weight)
      case 'Card':
        return this.renderCard(compProps, component.weight)
      case 'Text':
        return this.renderText(compProps, component.weight)
      case 'Button':
        return this.renderButton(compProps, component.weight)
      case 'TextField':
        return this.renderTextField(compProps, component.weight)
      case 'Tabs':
        return this.renderTabs(compProps, component.weight)
      case 'Tab':
        return this.renderTab(compProps, component.weight)
      case 'Icon':
        return this.renderIcon(compProps, component.weight)
      case 'Divider':
        return this.renderDivider(compProps, component.weight)
      default:
        return html`<div class="error">Unknown component type: ${compType}</div>`
    }
  }

  private renderRow(props: any, weight?: number) {
    const children = this.renderChildren(props.children)
    const alignment = props.alignment || 'start'
    const distribution = props.distribution || 'start'

    return html`
      <div
        class="row ${alignment} ${distribution}"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        ${children}
      </div>
    `
  }

  private renderColumn(props: any, weight?: number) {
    const children = this.renderChildren(props.children)
    const alignment = props.alignment || 'start'
    const distribution = props.distribution || 'start'

    return html`
      <div
        class="column ${alignment} ${distribution}"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        ${children}
      </div>
    `
  }

  private renderList(props: any, weight?: number) {
    if (props.children?.template) {
      const template = props.children.template
      const dataBinding = template.dataBinding
      const data = this.resolveBinding({ path: dataBinding })

      if (data && typeof data === 'object') {
        const items = Object.entries(data).map(([key, value]) => ({
          id: key,
          data: value,
        }))

        return html`
          <div
            class="list"
            style="${weight ? `flex: ${weight};` : ''}"
          >
            ${repeat(
              items,
              (item) => item.id,
              (item, index) => {
                // Create a temporary data context for template rendering
                const originalData = this.dataModel
                this.dataModel = { ...originalData, ...item.data }

                const templateComponent = this.components.get(template.componentId)
                const result = templateComponent ? this.renderComponent(templateComponent) : nothing

                // Restore original data context
                this.dataModel = originalData

                return html`<div data-item-id="${item.id}">${result}</div>`
              },
            )}
          </div>
        `
      }
    }

    return html`<div class="list" style="${weight ? `flex: ${weight};` : ''}"></div>`
  }

  private renderCard(props: any, weight?: number) {
    const childComponent = this.components.get(props.child)
    const child = childComponent ? this.renderComponent(childComponent) : nothing

    return html`
      <div
        class="card"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        ${child}
      </div>
    `
  }

  private renderText(props: any, weight?: number) {
    const textValue = this.resolveBinding(props.text) || ''
    const usageHint = props.usageHint || 'body'

    return html`
      <div
        class="text ${usageHint}"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        ${textValue}
      </div>
    `
  }

  private renderButton(props: any, weight?: number) {
    const childComponent = this.components.get(props.child)
    const child = childComponent ? this.renderComponent(childComponent) : html`Button`
    const action = props.action

    return html`
      <button
        class="button ${props.primary ? 'primary' : ''} ${props.secondary ? 'secondary' : ''}"
        style="${weight ? `flex: ${weight};` : ''}"
        @click=${(e: Event) => this.handleAction(action, e)}
      >
        ${child}
      </button>
    `
  }

  private renderTextField(props: any, weight?: number) {
    const label = this.resolveBinding(props.label) || ''
    const value = this.resolveBinding(props.value) || ''
    const action = props.action

    return html`
      <div
        class="text-field"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        <label>${label}</label>
        <input
          type="${props.type || 'text'}"
          .value=${value}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement
            this.handleAction(action, e)
          }}
        />
      </div>
    `
  }

  private renderTabs(props: any, weight?: number) {
    const children = this.renderChildren(props.children)
    const selectedTabBinding = props.selectedTabBinding
    const selectedTab = this.resolveBinding({ path: selectedTabBinding }) || ''

    return html`
      <div
        class="tabs"
        style="${weight ? `flex: ${weight};` : ''}"
      >
        ${children}
      </div>
    `
  }

  private renderTab(props: any, weight?: number) {
    const contentComponent = this.components.get(props.content)
    const content = contentComponent ? this.renderComponent(contentComponent) : nothing

    return html`
      <div class="tab-panel" style="${weight ? `flex: ${weight};` : ''}">
        ${content}
      </div>
    `
  }

  private renderIcon(props: any, weight?: number) {
    const iconType = props.iconType || 'placeholder'

    return html`
      <div
        class="icon icon-${iconType}"
        style="${weight ? `flex: ${weight};` : ''}"
        title="${iconType}"
      >
        ${iconType}
      </div>
    `
  }

  private renderDivider(props: any, weight?: number) {
    const orientation = props.orientation || 'horizontal'

    return html`
      <hr
        class="divider ${orientation}"
        style="${weight ? `flex: ${weight};` : ''}"
      />
    `
  }

  private renderChildren(children: any): any {
    if (!children) return nothing

    if (children.explicitList) {
      return children.explicitList.map((childId: string) => {
        const childComponent = this.components.get(childId)
        return childComponent ? this.renderComponent(childComponent) : nothing
      })
    }

    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'a2ui-renderer': A2UIRenderer
  }
}
