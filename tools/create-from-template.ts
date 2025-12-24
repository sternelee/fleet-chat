#!/usr/bin/env node

/**
 * Create Plugin from Template
 *
 * Creates a new Fleet Chat plugin from the template
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface TemplateOptions {
  name: string
  title?: string
  description?: string
  author?: string
  icon?: string
}

const PLACEHOLDERS = {
  '{{PLUGIN_NAME}}': 'name',
  '{{PLUGIN_TITLE}}': 'title',
  '{{PLUGIN_DESCRIPTION}}': 'description',
  '{{PLUGIN_AUTHOR}}': 'author',
  '{{PLUGIN_ICON}}': 'icon',
}

function replacePlaceholders(content: string, options: TemplateOptions): string {
  let result = content

  for (const [placeholder, key] of Object.entries(PLACEHOLDERS)) {
    const value = options[key as keyof TemplateOptions] || ''
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  return result
}

function createFromTemplate(pluginName: string, options: Partial<TemplateOptions> = {}) {
  const templateDir = join(__dirname, '../templates/plugin-template')
  const targetDir = join(process.cwd(), pluginName)

  if (existsSync(targetDir)) {
    console.error(`❌ Directory ${targetDir} already exists`)
    process.exit(1)
  }

  // Default options
  const fullOptions: TemplateOptions = {
    name: pluginName,
    title:
      options.title ||
      pluginName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    description: options.description || `${pluginName} plugin for Fleet Chat`,
    author: options.author || 'Fleet Chat Developer',
    icon: options.icon || '🚀',
  }

  console.log(`🚀 Creating plugin "${pluginName}" from template...`)

  // Create target directory
  mkdirSync(targetDir, { recursive: true })
  mkdirSync(join(targetDir, 'src'), { recursive: true })
  mkdirSync(join(targetDir, 'assets'), { recursive: true })

  // Process template files
  const files = ['package.json', 'src/index.ts', 'README.md']

  files.forEach((file) => {
    const sourcePath = join(templateDir, file)
    const targetPath = join(targetDir, file)
    const content = readFileSync(sourcePath, 'utf-8')
    const processedContent = replacePlaceholders(content, fullOptions)
    writeFileSync(targetPath, processedContent)
  })

  console.log(`✅ Plugin created: ${targetDir}`)
  console.log(`📝 Next steps:`)
  console.log(`   1. cd ${pluginName}`)
  console.log(`   2. Edit src/index.ts to customize your plugin`)
  console.log(`   3. Run: node ../../tools/simple-packer.ts .`)
  console.log(`   4. Load the .fcp file in Fleet Chat`)
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Plugin name is required')
    console.log('Usage: create-from-template <plugin-name> [options]')
    console.log('')
    console.log('Options:')
    console.log('  --title <title>       Plugin title (display name)')
    console.log('  --description <desc>  Plugin description')
    console.log('  --author <author>     Plugin author')
    console.log('  --icon <icon>         Plugin icon (emoji)')
    process.exit(1)
  }

  const pluginName = args[0]
  const options: Partial<TemplateOptions> = {}

  // Parse options
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i]
    const value = args[i + 1]

    switch (flag) {
      case '--title':
        options.title = value
        break
      case '--description':
        options.description = value
        break
      case '--author':
        options.author = value
        break
      case '--icon':
        options.icon = value
        break
    }
  }

  createFromTemplate(pluginName, options)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { createFromTemplate }
