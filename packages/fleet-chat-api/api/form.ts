/**
 * Form Component API Stub
 *
 * This is a placeholder for the Form component API
 * The actual implementation is in src/plugins/ui/components/fc-form.ts
 */

export interface FormProps {
  children?: any
  actions?: any[]
  navigationTitle?: string
  validation?: boolean
  id?: string
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
}

// Stub Form component - actual implementation in UI components
export const Form = {
  // Placeholder for Form component
  create: (_props: FormProps) => {
    // This would create a Form component
    return null
  },
}

export default Form
