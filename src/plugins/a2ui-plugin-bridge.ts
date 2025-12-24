/**
 * A2UI Plugin Bridge
 *
 * Bridges the A2UI plugin generation system with Fleet Chat's plugin system.
 * Handles conversion from generated code to installable plugins.
 */

import type { PluginManifest } from '../../packages/fleet-chat-api/plugins/core/types.js'
import { PluginLoader } from './plugin-loader.js'
import type { PluginManager } from './plugin-manager.js'

export interface GeneratedPluginData {
  manifest: {
    name: string
    version: string
    description: string
    author: string
    icon: string
    commands: Array<{
      name: string
      title: string
      description: string
      mode: string
    }>
    categories?: string[]
    preferences?: any[]
  }
  source_code: string
  plugin_id: string
  package_name: string
  explanation: string
  warnings?: string[]
}

export interface PluginPackage {
  manifest: PluginManifest
  code: string
  metadata: {
    generatedBy: 'a2ui'
    generatedAt: string
    pluginId: string
  }
}

export class A2UIPluginBridge {
  private pluginManager: PluginManager
  private pluginLoader: PluginLoader

  constructor(pluginManager: PluginManager) {
    this.pluginManager = pluginManager
    this.pluginLoader = new PluginLoader(pluginManager)
  }

  /**
   * Convert A2UI generated plugin data to Fleet Chat plugin package
   */
  convertToPluginPackage(generatedData: GeneratedPluginData): PluginPackage {
    // Convert the generated manifest to Fleet Chat's PluginManifest format
    const manifest: PluginManifest = {
      name: generatedData.manifest.name,
      version: generatedData.manifest.version,
      description: generatedData.manifest.description,
      author: generatedData.manifest.author,
      icon: generatedData.manifest.icon,
      commands: generatedData.manifest.commands.map((cmd) => ({
        name: cmd.name,
        title: cmd.title,
        description: cmd.description,
        mode: cmd.mode as 'view' | 'no-view',
      })),
      categories: generatedData.manifest.categories,
      preferences: generatedData.manifest.preferences,
    }

    return {
      manifest,
      code: generatedData.source_code,
      metadata: {
        generatedBy: 'a2ui',
        generatedAt: new Date().toISOString(),
        pluginId: generatedData.plugin_id,
      },
    }
  }

  /**
   * Create a .fcp file from generated plugin data
   */
  async createPluginFile(generatedData: GeneratedPluginData): Promise<Blob> {
    const pluginPackage = this.convertToPluginPackage(generatedData)

    // Create the plugin structure
    const pluginData = {
      manifest: pluginPackage.manifest,
      files: {
        'src/index.ts': pluginPackage.code,
      },
      metadata: pluginPackage.metadata,
    }

    // Convert to JSON and create blob
    const jsonString = JSON.stringify(pluginData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    return blob
  }

  /**
   * Install a generated plugin directly into the plugin system
   */
  async installGeneratedPlugin(generatedData: GeneratedPluginData): Promise<void> {
    try {
      // Create plugin file blob
      const blob = await this.createPluginFile(generatedData)

      // Convert blob to File
      const file = new File([blob], generatedData.package_name, { type: 'application/json' })

      // Use plugin loader to install
      await this.pluginLoader.loadPluginFromFile(file)

      console.log(`✅ Successfully installed plugin: ${generatedData.manifest.name}`)
    } catch (error) {
      console.error('❌ Failed to install generated plugin:', error)
      throw error
    }
  }

  /**
   * Validate generated plugin code
   */
  validatePluginCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for required imports
    if (!code.includes("from '@fleet-chat/raycast-api'")) {
      errors.push('Missing required import from @fleet-chat/raycast-api')
    }

    // Check for export default
    if (!code.includes('export default')) {
      errors.push('Missing default export for command function')
    }

    // Check for React import if using JSX
    if (code.includes('<') && code.includes('>') && !code.includes('import React')) {
      errors.push('Missing React import for JSX syntax')
    }

    // Check for basic syntax issues
    const openBraces = (code.match(/{/g) || []).length
    const closeBraces = (code.match(/}/g) || []).length
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces in code')
    }

    const openParens = (code.match(/\(/g) || []).length
    const closeParens = (code.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses in code')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Enhance generated code with additional features
   */
  enhancePluginCode(
    code: string,
    options: {
      addErrorHandling?: boolean
      addLogging?: boolean
      addTypeScript?: boolean
    } = {},
  ): string {
    let enhanced = code

    // Add error boundary wrapper if requested
    if (options.addErrorHandling) {
      enhanced = this.wrapWithErrorBoundary(enhanced)
    }

    // Add logging if requested
    if (options.addLogging) {
      enhanced = this.addLogging(enhanced)
    }

    // Add TypeScript types if requested
    if (options.addTypeScript) {
      enhanced = this.enhanceWithTypes(enhanced)
    }

    return enhanced
  }

  private wrapWithErrorBoundary(code: string): string {
    // Find the default export
    const exportMatch = code.match(/export default function (\w+)/)
    if (!exportMatch) return code

    const functionName = exportMatch[1]

    return (
      code.replace(
        /export default function \w+\(\)/,
        `export default function ${functionName}() {
  try {`,
      ) +
      `
  } catch (error) {
    console.error('Plugin error:', error);
    return (
      <Detail
        markdown={\`# Error\\n\\nAn error occurred: \${error instanceof Error ? error.message : String(error)}\`}
      />
    );
  }
}`
    )
  }

  private addLogging(code: string): string {
    // Add console.log at the start of the main function
    return code.replace(
      /export default function (\w+)\(\) {/,
      `export default function $1() {
  console.log('Plugin ${1} started');`,
    )
  }

  private enhanceWithTypes(code: string): string {
    // Add type annotations to common patterns
    let typed = code

    // Add types to useState
    typed = typed.replace(
      /const \[(\w+), set\w+\] = useState\(\[\]\);/g,
      'const [$1, set$1] = useState<any[]>([]);',
    )

    typed = typed.replace(
      /const \[(\w+), set\w+\] = useState\(''\);/g,
      "const [$1, set$1] = useState<string>('');",
    )

    typed = typed.replace(
      /const \[(\w+), set\w+\] = useState\(false\);/g,
      'const [$1, set$1] = useState<boolean>(false);',
    )

    return typed
  }

  /**
   * Get plugin statistics
   */
  getPluginStats(code: string): {
    lines: number
    imports: number
    components: number
    hooks: number
  } {
    const lines = code.split('\n').length
    const imports = (code.match(/^import /gm) || []).length
    const components = (code.match(/<[A-Z]\w+/g) || []).length
    const hooks = (code.match(/use[A-Z]\w+/g) || []).length

    return { lines, imports, components, hooks }
  }
}

/**
 * Create a global instance of the bridge
 */
let bridgeInstance: A2UIPluginBridge | null = null

export function initializeA2UIBridge(pluginManager: PluginManager): A2UIPluginBridge {
  if (!bridgeInstance) {
    bridgeInstance = new A2UIPluginBridge(pluginManager)
  }
  return bridgeInstance
}

export function getA2UIBridge(): A2UIPluginBridge | null {
  return bridgeInstance
}

/**
 * Utility function to download plugin as file
 */
export async function downloadGeneratedPlugin(
  generatedData: GeneratedPluginData,
  bridge: A2UIPluginBridge,
): Promise<void> {
  try {
    const blob = await bridge.createPluginFile(generatedData)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generatedData.package_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download plugin:', error)
    throw error
  }
}

/**
 * Utility function to validate and preview plugin
 */
export function previewGeneratedPlugin(
  generatedData: GeneratedPluginData,
  bridge: A2UIPluginBridge,
): {
  validation: { valid: boolean; errors: string[] }
  stats: { lines: number; imports: number; components: number; hooks: number }
  package: PluginPackage
} {
  const validation = bridge.validatePluginCode(generatedData.source_code)
  const stats = bridge.getPluginStats(generatedData.source_code)
  const package_ = bridge.convertToPluginPackage(generatedData)

  return {
    validation,
    stats,
    package: package_,
  }
}
