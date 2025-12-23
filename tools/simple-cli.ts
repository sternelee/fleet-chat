#!/usr/bin/env node

/**
 * Simple Fleet Chat Plugin CLI
 *
 * Simplified command-line interface for the new plugin system
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync, readdirSync } from 'fs'
import { join, basename, dirname } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface PluginConfig {
  name: string
  version: string
  description: string
  author: string
  commands: Array<{
    name: string
    title: string
    description?: string
    mode?: 'no-view' | 'view'
  }>
  icon?: string
}

function createPlugin(name: string, options: { force?: boolean } = {}) {
  const pluginDir = join(process.cwd(), name)

  if (existsSync(pluginDir) && !options.force) {
    console.error(`❌ Plugin directory ${pluginDir} already exists. Use --force to overwrite.`)
    process.exit(1)
  }

  console.log(`🚀 Creating Fleet Chat plugin: ${name}`)

  // Create plugin directory structure
  mkdirSync(pluginDir, { recursive: true })
  mkdirSync(join(pluginDir, 'src'), { recursive: true })

  // Generate package.json
  const packageJson: PluginConfig = {
    name: name,
    version: '1.0.0',
    description: `${name} plugin for Fleet Chat`,
    author: 'Fleet Chat Developer',
    commands: [
      {
        name: 'default',
        title: name
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        description: `${name} plugin functionality`,
        mode: 'view',
      },
    ],
    icon: '🚀',
  }

  writeFileSync(join(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2))

  // Generate plugin source code
  const pluginCode = `/**
 * ${name} Plugin for Fleet Chat
 */

import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello from ${name}!"
        subtitle="This is your Fleet Chat plugin"
        actions={
          <ActionPanel>
            <Action
              title="Say Hello"
              onAction={() => {
                showToast({
                  title: "Hello!",
                  message: "Welcome to Fleet Chat plugin development"
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
`

  writeFileSync(join(pluginDir, 'src/index.ts'), pluginCode)

  // Generate README
  const readme = `# ${name} Plugin

${packageJson.description}

## Getting Started

1. Install dependencies: \`pnpm install\`
2. Pack the plugin: \`node ../../tools/simple-packer.ts .\`
3. Load the \`${name}.fcp\` file in Fleet Chat

## Development

Edit \`src/index.ts\` to add your plugin functionality.

## Building

\`\`\`bash
# Pack the plugin for distribution
node ../../tools/simple-packer.ts .
\`\`\`

## Resources

- [Fleet Chat Plugin Guide](../../docs/PLUGIN_SYSTEM_GUIDE.md)
- [API Reference](../../packages/fleet-chat-api/)
- [Example Plugins](../examples/)
`

  writeFileSync(join(pluginDir, 'README.md'), readme)

  console.log(`✅ Plugin created successfully: ${pluginDir}`)
  console.log(`📝 Next steps:`)
  console.log(`   1. cd ${name}`)
  console.log(`   2. Edit src/index.ts to customize your plugin`)
  console.log(`   3. Run: node ../../tools/simple-packer.ts .`)
  console.log(`   4. Load the .fcp file in Fleet Chat`)
}

function packPlugin(pluginPath: string) {
  const packerPath = join(__dirname, 'simple-packer.ts')

  console.log(`📦 Packing plugin: ${pluginPath}`)

  const child = spawn('node', [packerPath, pluginPath], {
    stdio: 'inherit',
  })

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`✅ Plugin packed successfully!`)
    } else {
      console.error(`❌ Failed to pack plugin`)
      process.exit(code || 1)
    }
  })
}

function listPlugins() {
  const examplesDir = join(__dirname, '../examples')

  if (!existsSync(examplesDir)) {
    console.log('No examples directory found.')
    return
  }

  const plugins = readdirSync(examplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  console.log('📋 Available Fleet Chat plugins:')

  plugins.forEach((plugin) => {
    const pluginDir = join(examplesDir, plugin)
    const packageJsonPath = join(pluginDir, 'package.json')

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        console.log(`  • ${plugin} - ${packageJson.description} (${packageJson.version})`)

        // Check for .fcp file (both in examples directory and plugin directory)
        const fcpFile1 = join(examplesDir, `${plugin}.fcp`)
        const fcpFile2 = join(pluginDir, `${plugin}.fcp`)

        if (existsSync(fcpFile1)) {
          const stats = statSync(fcpFile1)
          console.log(`    ✅ Packed (${(stats.size / 1024).toFixed(1)} KB)`)
        } else if (existsSync(fcpFile2)) {
          const stats = statSync(fcpFile2)
          console.log(`    ✅ Packed (${(stats.size / 1024).toFixed(1)} KB)`)
        } else {
          console.log(`    ❓ Not packed`)
        }
      } catch (error) {
        console.log(`  • ${plugin} - Invalid package.json`)
      }
    } else {
      console.log(`  • ${plugin} - No package.json`)
    }
  })
}

function showHelp() {
  console.log(`
Fleet Chat Plugin CLI - Simple Plugin Development Tool

Usage:
  simple-cli <command> [options]

Commands:
  create <name>           Create a new plugin
  pack <path>            Pack a plugin into .fcp file
  list                   List available plugins
  help                   Show this help message

Examples:
  simple-cli create my-awesome-plugin
  simple-cli pack ./my-plugin
  simple-cli list

Options:
  --force               Overwrite existing plugin directory (create command only)
`)
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    showHelp()
    return
  }

  const command = args[0]

  switch (command) {
    case 'create':
      if (args.length < 2) {
        console.error('❌ Plugin name is required.')
        console.log('Usage: simple-cli create <plugin-name>')
        process.exit(1)
      }
      createPlugin(args[1], { force: args.includes('--force') })
      break

    case 'pack':
      if (args.length < 2) {
        console.error('❌ Plugin path is required.')
        console.log('Usage: simple-cli pack <plugin-path>')
        process.exit(1)
      }
      packPlugin(args[1])
      break

    case 'list':
      listPlugins()
      break

    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break

    default:
      console.error(`❌ Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { createPlugin, packPlugin, listPlugins }
