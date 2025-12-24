#!/usr/bin/env node

/**
 * Fleet Chat Plugin CLI
 *
 * Command-line interface for creating and managing Fleet Chat plugins
 * Supports converting existing Raycast plugins to Fleet Chat format
 */

import { spawn } from 'child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Fleet Chat specific API compatibility layer
const FLEET_CHAT_IMPORTS = {
  '@raycast/api': '@fleet-chat/raycast-api',
  '@raycast/utils': '@fleet-chat/raycast-api/utils',
}

// Standard Raycast commands that need special handling
const RAYCAST_TO_FLEET_CHAT_COMPONENTS = {
  // Layout components
  List: 'List',
  Grid: 'Grid',
  Detail: 'Detail',
  Form: 'Form',
  ActionPanel: 'ActionPanel',
  Action: 'Action',
  MenuBarExtra: 'MenuBarExtra',

  // UI components
  TextField: 'Form.TextField',
  TextArea: 'Form.TextArea',
  Dropdown: 'Form.Dropdown',
  Checkbox: 'Form.Checkbox',
  RadioGroup: 'Form.RadioGroup',

  // Utilities
  Icon: 'Icon',
  Color: 'Color',
  Image: 'Image',
  showToast: 'showToast',
  showHUD: 'showHUD',
  open: 'open',
  showInFinder: 'showInFinder',
  getPreferenceValues: 'getPreferenceValues',
  LocalList: 'LocalList',
  Clipboard: 'Clipboard',
  getApplications: 'getApplications',
  getFrontmostApplication: 'getFrontmostApplication',
}

/**
 * Parse Raycast package.json and convert to Fleet Chat format
 */
function parseRaycastManifest(raycastManifest, pluginName) {
  const fleetManifest = {
    name: pluginName || raycastManifest.name,
    version: raycastManifest.version || '1.0.0',
    description: raycastManifest.description || `${pluginName} plugin for Fleet Chat`,
    author: raycastManifest.author || 'Fleet Chat Developer',
    license: raycastManifest.license || 'MIT',

    // Raycast categories
    categories: raycastManifest.categories || [],

    // Commands conversion
    commands: (raycastManifest.commands || []).map((cmd) => ({
      name: cmd.name,
      title: cmd.title,
      description: cmd.description,
      mode: cmd.mode || 'view',
      // Skip preferences for now as they're handled separately
      preferences: cmd.preferences || [],
      arguments: cmd.arguments || [],
    })),

    // Preferences (global settings)
    preferences: (raycastManifest.preferences || []).map((pref) => ({
      name: pref.name,
      type: pref.type,
      title: pref.title || pref.name,
      description: pref.description || '',
      required: pref.required || false,
      default: pref.default,
      data: pref.data,
      label: pref.label,
    })),

    // Icon handling
    icon: raycastManifest.icon || '🚀',

    // Platform support
    platforms: raycastManifest.platforms || ['macOS', 'Windows'],
  }

  return fleetManifest
}

/**
 * Convert Raycast source files to Fleet Chat format
 */
function convertSourceFile(sourcePath, targetPath, pluginName) {
  let content = readFileSync(sourcePath, 'utf-8')

  // Replace Raycast imports with Fleet Chat equivalents
  content = content.replace(/from ['"]@raycast\/api['"]/g, "from '@fleet-chat/raycast-api'")

  content = content.replace(/from ['"]@raycast\/utils['"]/g, "from '@fleet-chat/raycast-api/utils'")

  // Convert @raycast/api imports that are destructured
  content = content.replace(
    /import\s*{([^}]+)}\s*from\s*['"]@raycast\/api['"]/g,
    (match, imports) => {
      const importList = imports.split(',').map((i) => i.trim())
      const fleetImports = importList.map((imp) => {
        const baseName = imp.split(' as ')[0].trim()
        const alias = imp.split(' as ')[1]?.trim()
        const mappedName = RAYCAST_TO_FLEET_CHAT_COMPONENTS[baseName] || baseName
        return alias ? `${mappedName} as ${alias}` : mappedName
      })
      return `import { ${fleetImports.join(', ')} } from '@fleet-chat/raycast-api'`
    },
  )

  // Convert environment API calls
  content = content.replace(/environment\.supportPath/g, 'environment.supportPath')

  // Convert showToast calls (Raycast API has different signature)
  content = content.replace(
    /showToast\({\s*title:\s*([^,]+),\s*message:\s*([^}]+)\s*}\)/g,
    'showToast({ title: $1, message: $2 })',
  )

  // Handle LocalStorage imports
  content = content.replace(
    /import\s*{?\s*LocalStorage\s*}?\s*from\s*['"]@raycast\/api['"]/g,
    "import { LocalStorage } from '@fleet-chat/raycast-api/storage'",
  )

  // Handle Clipboard imports
  content = content.replace(
    /import\s*{?\s*Clipboard\s*}?\s*from\s*['"]@raycast\/api['"]/g,
    "import { Clipboard } from '@fleet-chat/raycast-api/system'",
  )

  writeFileSync(targetPath, content)
}

/**
 * Convert a Raycast plugin to Fleet Chat format
 */
function convertRaycastPlugin(raycastPath, options = {}) {
  const pluginName = options.name || raycastPath.split('/').pop()
  const targetDir = join(process.cwd(), 'src/plugins/examples', pluginName)

  console.log(`🔄 Converting Raycast plugin: ${pluginName}`)
  console.log(`   Source: ${raycastPath}`)
  console.log(`   Target: ${targetDir}`)

  // Check if Raycast plugin exists
  if (!existsSync(raycastPath)) {
    console.error(`❌ Raycast plugin not found at: ${raycastPath}`)
    process.exit(1)
  }

  const packageJsonPath = join(raycastPath, 'package.json')
  if (!existsSync(packageJsonPath)) {
    console.error(`❌ package.json not found in Raycast plugin`)
    process.exit(1)
  }

  // Create target directory
  if (existsSync(targetDir)) {
    if (!options.force) {
      console.error(`❌ Target directory already exists: ${targetDir}`)
      console.log(`   Use --force to overwrite`)
      process.exit(1)
    }
    console.log(`   Removing existing directory...`)
    rmSync(targetDir, { recursive: true, force: true })
  }
  mkdirSync(targetDir, { recursive: true })

  // Read and convert manifest
  const raycastManifest = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  const fleetManifest = parseRaycastManifest(raycastManifest, pluginName)

  // Create source directory
  const sourceDir = join(raycastPath, 'src')
  const targetSourceDir = join(targetDir, 'src')

  if (existsSync(sourceDir)) {
    mkdirSync(targetSourceDir, { recursive: true })

    // Convert each source file
    const sourceFiles = readdirSync(sourceDir).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.jsx'),
    )
    sourceFiles.forEach((file) => {
      const sourcePath = join(sourceDir, file)
      const targetPath = join(targetSourceDir, file.replace('.tsx', '.ts').replace('.jsx', '.ts'))
      console.log(`   Converting: ${file}`)
      convertSourceFile(sourcePath, targetPath, pluginName)
    })

    // Copy subdirectories (hooks, components, forms, etc.)
    const subdirs = readdirSync(sourceDir).filter((f) => {
      const stat = statSync(join(sourceDir, f))
      return stat.isDirectory() && !f.startsWith('.')
    })

    subdirs.forEach((dir) => {
      const subdirPath = join(sourceDir, dir)
      const targetSubdirPath = join(targetSourceDir, dir)
      mkdirSync(targetSubdirPath, { recursive: true })

      const files = readdirSync(subdirPath).filter(
        (f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.jsx'),
      )
      files.forEach((file) => {
        const sourcePath = join(subdirPath, file)
        const targetPath = join(
          targetSubdirPath,
          file.replace('.tsx', '.ts').replace('.jsx', '.ts'),
        )
        console.log(`   Converting: ${dir}/${file}`)
        convertSourceFile(sourcePath, targetPath, pluginName)
      })
    })
  } else {
    // Create default index.ts if no src directory
    mkdirSync(targetSourceDir, { recursive: true })
    const defaultCode = `/**
 * ${pluginName} Plugin for Fleet Chat
 * Converted from Raycast extension
 */

import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="${fleetManifest.description}"
        subtitle="Converted from Raycast extension"
        actions={
          <ActionPanel>
            <Action
              title="Say Hello"
              onAction={() => {
                showToast({
                  title: "Hello from Fleet Chat!",
                  message: "This plugin was converted from Raycast"
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
    writeFileSync(join(targetSourceDir, 'index.ts'), defaultCode)
  }

  // Write converted manifest
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(fleetManifest, null, 2))

  // Generate Fleet Chat tsconfig.json
  const tsconfig = {
    extends: '../../../tsconfig.json',
    compilerOptions: {
      module: 'ESNext',
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      jsxImportSource: '@fleet-chat/raycast-api',
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      baseUrl: '.',
      paths: {
        '@/*': ['src/*'],
        '@raycast/api': ['./node_modules/@fleet-chat/raycast-api'],
        '@fleet-chat/api': ['./node_modules/@fleet-chat/api'],
      },
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'build'],
  }
  writeFileSync(join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))

  // Copy assets if they exist
  const assetsDir = join(raycastPath, 'assets')
  if (existsSync(assetsDir)) {
    const targetAssetsDir = join(targetDir, 'assets')
    mkdirSync(targetAssetsDir, { recursive: true })
    const assetFiles = readdirSync(assetsDir)
    assetFiles.forEach((file) => {
      copyFileSync(join(assetsDir, file), join(targetAssetsDir, file))
    })
    console.log(`   Copied ${assetFiles.length} asset file(s)`)
  }

  // Generate README
  const readme = `# ${pluginName} Plugin

${fleetManifest.description}

> **Converted from Raycast extension**
>
> This plugin was automatically converted from a Raycast extension using the Fleet Chat plugin CLI.

## Commands

${fleetManifest.commands
  .map(
    (cmd) => `
### ${cmd.title}
\`\`\`
cmd.${cmd.name}()
\`\`\`
${cmd.description}
`,
  )
  .join('\n')}

## Original Raycast Extension

This plugin is based on the [${raycastManifest.title || raycastManifest.name}](${raycastPath}) Raycast extension.

**Original Author:** ${raycastManifest.author || 'Unknown'}
**License:** ${raycastManifest.license || 'MIT'}

## Usage

1. Navigate to this plugin directory:
   \`\`\`
   cd src/plugins/examples/${pluginName}
   \`\`\`

2. Install dependencies:
   \`\`\`
   pnpm install
   \`\`\`

3. Start development:
   \`\`\`
   pnpm dev
   \`\`\`

4. Build the plugin:
   \`\`\`
   pnpm build
   \`\`\`

## Development Notes

- The plugin has been converted from Raycast's React-based API to Fleet Chat's compatible API
- Most UI components should work without modification
- Some Raycast-specific APIs may need manual adjustment
- See the Fleet Chat API documentation for details

## API Reference

- [Fleet Chat API Documentation](../../packages/fleet-chat-api/)
- [Raycast API Compatibility](../../packages/fleet-chat-api/raycast-api/)

## License

${fleetManifest.license}
`
  writeFileSync(join(targetDir, 'README.md'), readme)

  console.log(`\n✅ Plugin "${pluginName}" converted successfully!`)
  console.log(`📁 Location: ${targetDir}`)
  console.log(`\n⚠️  Review the following before running:`)
  console.log(`   1. Check converted source files for any issues`)
  console.log(`   2. Update dependencies in package.json if needed`)
  console.log(`   3. Test each command manually`)
  console.log(`\nNext steps:`)
  console.log(`  1. cd src/plugins/examples/${pluginName}`)
  console.log(`  2. pnpm install`)
  console.log(`  3. pnpm dev`)
}

/**
 * Create a new plugin from template
 */
function createPlugin(name, options = {}) {
  const pluginDir = join(process.cwd(), 'src/plugins/examples', name)

  if (existsSync(pluginDir) && !options.force) {
    console.error(`Plugin directory ${pluginDir} already exists. Use --force to overwrite.`)
    process.exit(1)
  }

  console.log(`Creating plugin: ${name}`)

  // Create plugin directory
  mkdirSync(pluginDir, { recursive: true })
  mkdirSync(join(pluginDir, 'src'), { recursive: true })

  // Use template if specified, otherwise use default
  const template = options.template || 'basic'

  if (template === 'menu-bar') {
    createMenuBarPlugin(pluginDir, name)
  } else if (template === 'form') {
    createFormPlugin(pluginDir, name)
  } else {
    createBasicPlugin(pluginDir, name)
  }

  console.log(`✅ Plugin "${name}" created successfully!`)
  console.log(`📁 Location: ${pluginDir}`)
  console.log(`\nNext steps:`)
  console.log(`  1. cd src/plugins/examples/${name}`)
  console.log(`  2. pnpm install`)
  console.log(`  3. pnpm dev`)
}

function createBasicPlugin(pluginDir, name) {
  const packageJson = {
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

  const pluginCode = `/**
 * ${name} Plugin for Fleet Chat
 */

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
}

function createMenuBarPlugin(pluginDir, name) {
  const packageJson = {
    name: name,
    version: '1.0.0',
    description: `${name} menu bar plugin for Fleet Chat`,
    author: 'Fleet Chat Developer',
    commands: [
      {
        name: 'menu_bar',
        title: name
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        description: `${name} menu bar functionality`,
        mode: 'menu-bar',
      },
    ],
    icon: '📊',
  }

  writeFileSync(join(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2))

  const pluginCode = `/**
 * ${name} Menu Bar Plugin for Fleet Chat
 */

import { MenuBarExtra, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <MenuBarExtra
      icon="📊"
      tooltip="${name}"
    >
      <MenuBarExtra.Item
        title="Refresh"
        onAction={() => showToast({ title: "Refreshing..." })}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Quit"
        onAction={() => showToast({ title: "Goodbye!" })}
        shortcut={{ modifiers: ["cmd"], key: "q" }}
      />
    </MenuBarExtra>
  );
}
`
  writeFileSync(join(pluginDir, 'src/index.ts'), pluginCode)
}

function createFormPlugin(pluginDir, name) {
  const packageJson = {
    name: name,
    version: '1.0.0',
    description: `${name} form plugin for Fleet Chat`,
    author: 'Fleet Chat Developer',
    commands: [
      {
        name: 'default',
        title: name
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        description: `${name} form functionality`,
        mode: 'view',
        preferences: [
          {
            name: 'apikey',
            type: 'password',
            required: true,
            title: 'API Key',
            description: 'Enter your API key',
          },
        ],
      },
    ],
    icon: '📝',
  }

  writeFileSync(join(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2))

  const pluginCode = `/**
 * ${name} Form Plugin for Fleet Chat
 */

import { Form, showToast, getPreferenceValues } from '@fleet-chat/raycast-api';

interface Preferences {
  apikey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const handleSubmit = (values: { name: string; email: string }) => {
    showToast({
      title: "Form Submitted",
      message: \`Name: \${values.name}, Email: \${values.email}\`
    });
  };

  return (
    <Form
      actions={
        <>
          <Form.SubmitButton title="Submit" onSubmit={handleSubmit} />
          <Form.SubmitButton
            title="Reset"
            onSubmit={() => showToast({ title: "Reset" })}
          />
        </>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter your name"
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your email"
      />
    </Form>
  );
}
`
  writeFileSync(join(pluginDir, 'src/index.ts'), pluginCode)
}

/**
 * Package a plugin as .fcp file
 */
function packagePlugin(name) {
  const pluginDir = join(process.cwd(), 'src/plugins/examples', name)

  if (!existsSync(pluginDir)) {
    console.error(`Plugin "${name}" not found.`)
    process.exit(1)
  }

  console.log(`Packaging plugin: ${name}`)

  // Import archiver dynamically
  const archiver = require('archiver')
  const output = require('fs').createWriteStream(`${name}.fcp`)
  const archive = archiver('zip', { zlib: { level: 9 } })

  output.on('close', () => {
    console.log(`✅ Plugin packaged: ${archive.pointer()} bytes`)
    console.log(`📦 Output: ${name}.fcp`)
  })

  archive.on('error', (err) => {
    console.error(`❌ Packaging error: ${err}`)
    process.exit(1)
  })

  archive.pipe(output)

  // Add package.json
  archive.file(join(pluginDir, 'package.json'), { name: 'package.json' })

  // Add manifest.json (for compatibility)
  if (existsSync(join(pluginDir, 'package.json'))) {
    const manifest = JSON.parse(readFileSync(join(pluginDir, 'package.json'), 'utf-8'))
    archive.file(join(pluginDir, 'package.json'), { name: 'manifest.json' })
  }

  // Add source files
  const srcDir = join(pluginDir, 'src')
  if (existsSync(srcDir)) {
    archive.directory(srcDir, { name: 'src' })
  }

  // Add assets
  const assetsDir = join(pluginDir, 'assets')
  if (existsSync(assetsDir)) {
    archive.directory(assetsDir, { name: 'assets' })
  }

  // Add metadata.json with build info
  const metadata = {
    buildTime: new Date().toISOString(),
    fleetChatVersion: getFleetChatVersion(),
    transformation: {
      reactToLit: true,
      compiler: 'fleet-chat-cli',
      timestamp: new Date().toISOString(),
    },
  }
  archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

  archive.finalize()
}

function getFleetChatVersion() {
  try {
    const pkgPath = join(process.cwd(), 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

/**
 * Validate a plugin
 */
function validatePlugin(pluginPath) {
  console.log(`Validating plugin: ${pluginPath}`)

  const packageJsonPath = existsSync(join(pluginPath, 'package.json'))
    ? join(pluginPath, 'package.json')
    : join(pluginPath, 'manifest.json')

  if (!existsSync(packageJsonPath)) {
    console.error(`❌ No package.json or manifest.json found`)
    return false
  }

  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

    let errors = 0
    let warnings = 0

    // Validate required fields
    if (!manifest.name) {
      console.error(`❌ Missing required field: name`)
      errors++
    }
    if (!manifest.version) {
      console.error(`❌ Missing required field: version`)
      errors++
    }
    if (!manifest.description) {
      console.warn(`⚠️  Missing recommended field: description`)
      warnings++
    }
    if (!manifest.commands || manifest.commands.length === 0) {
      console.warn(`⚠️  No commands defined`)
      warnings++
    }

    // Validate commands
    if (manifest.commands) {
      manifest.commands.forEach((cmd, i) => {
        if (!cmd.name) {
          console.error(`❌ Command ${i}: missing name`)
          errors++
        }
        if (!cmd.title) {
          console.warn(`⚠️  Command ${cmd.name}: missing title`)
          warnings++
        }
        if (!cmd.mode) {
          console.warn(`⚠️  Command ${cmd.name}: missing mode (defaulting to 'view')`)
          warnings++
        }
      })
    }

    // Validate preferences
    if (manifest.preferences) {
      manifest.preferences.forEach((pref, i) => {
        if (!pref.name) {
          console.error(`❌ Preference ${i}: missing name`)
          errors++
        }
        if (!pref.type) {
          console.error(`❌ Preference ${pref.name}: missing type`)
          errors++
        }
      })
    }

    if (errors > 0) {
      console.error(`\n❌ Validation failed: ${errors} error(s), ${warnings} warning(s)`)
      return false
    } else {
      console.log(`\n✅ Validation passed: ${warnings} warning(s)`)
      return true
    }
  } catch (error) {
    console.error(`❌ Failed to parse manifest: ${error.message}`)
    return false
  }
}

function listPlugins() {
  const pluginsDir = join(process.cwd(), 'src/plugins/examples')

  if (!existsSync(pluginsDir)) {
    console.log('No plugins directory found.')
    return
  }

  const plugins = readdirSync(pluginsDir).filter((dir) => {
    const stat = statSync(join(pluginsDir, dir))
    return stat.isDirectory()
  })

  if (plugins.length === 0) {
    console.log('No plugins found.')
    return
  }

  console.log('Available plugins:')
  plugins.forEach((plugin) => {
    const manifestPath = join(pluginsDir, plugin, 'package.json')
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        console.log(`  📦 ${plugin} - ${manifest.description}`)
        console.log(`     Commands: ${manifest.commands?.length || 0}`)
        console.log(`     Version: ${manifest.version}`)
        console.log()
      } catch (error) {
        console.log(`  📦 ${plugin} - (Unable to read manifest)`)
      }
    }
  })
}

function buildPlugin(name) {
  const pluginDir = join(process.cwd(), 'src/plugins/examples', name)

  if (!existsSync(pluginDir)) {
    console.error(`Plugin "${name}" not found in src/plugins/examples/`)
    process.exit(1)
  }

  console.log(`Building plugin: ${name}`)

  return new Promise((resolve, reject) => {
    const build = spawn('pnpm', ['build'], {
      cwd: pluginDir,
      stdio: 'inherit',
    })

    build.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Plugin "${name}" built successfully!`)
        resolve(code)
      } else {
        console.error(`❌ Plugin "${name}" build failed with code ${code}`)
        reject(code)
      }
    })
  })
}

function showHelp() {
  console.log(`
Fleet Chat Plugin CLI v2.0

Usage:
  pnpm plugin create <name>              Create a new plugin
  pnpm plugin convert <raycast-path>     Convert Raycast extension to Fleet Chat
  pnpm plugin list                       List all available plugins
  pnpm plugin build <name>               Build a specific plugin
  pnpm plugin package <name>             Package plugin as .fcp file
  pnpm plugin validate <path>            Validate plugin manifest
  pnpm plugin dev <name>                 Run plugin in development mode

Options:
  --force                                Overwrite existing plugin
  --template <template>                  Use specific template (basic, menu-bar, form)
  --name <name>                          Specify custom plugin name (for convert)

Templates:
  basic                                  Standard list-based plugin (default)
  menu-bar                               Menu bar extension plugin
  form                                   Form-based plugin with preferences

Examples:
  # Create new plugin
  pnpm plugin create my-plugin
  pnpm plugin create my-plugin --template menu-bar

  # Convert Raycast extension
  pnpm plugin convert ~/projects/raycast-extension-todo-list
  pnpm plugin convert ~/projects/raycast-extension-todo-list --name todo-list

  # Package plugin
  pnpm plugin package my-plugin

  # Validate plugin
  pnpm plugin validate src/plugins/examples/my-plugin

For more information, see: https://github.com/sternelee/fleet-chat/blob/main/WORKSPACE.md
`)
}

// CLI logic
const args = process.argv.slice(2)
const command = args[0]
const options = {
  force: args.includes('--force'),
  template: args.find((arg) => arg.startsWith('--template='))?.split('=')[1],
  name: args.find((arg) => arg.startsWith('--name='))?.split('=')[1],
}

if (!command || command === 'help') {
  showHelp()
} else if (command === 'create') {
  const name = args.find((arg) => !arg.startsWith('--') && arg !== 'create')
  if (!name) {
    console.error('Plugin name is required.')
    process.exit(1)
  }
  createPlugin(name, options)
} else if (command === 'convert') {
  const raycastPath = args.find((arg) => !arg.startsWith('--') && arg !== 'convert')
  if (!raycastPath) {
    console.error('Raycast extension path is required.')
    console.log('Usage: pnpm plugin convert <raycast-path>')
    process.exit(1)
  }
  convertRaycastPlugin(raycastPath, options)
} else if (command === 'list') {
  listPlugins()
} else if (command === 'build') {
  const name = args.find((arg) => !arg.startsWith('--') && arg !== 'build')
  if (!name) {
    console.error('Plugin name is required.')
    process.exit(1)
  }
  buildPlugin(name)
} else if (command === 'package') {
  const name = args.find((arg) => !arg.startsWith('--') && arg !== 'package')
  if (!name) {
    console.error('Plugin name is required.')
    process.exit(1)
  }
  packagePlugin(name)
} else if (command === 'validate') {
  const path = args.find((arg) => !arg.startsWith('--') && arg !== 'validate')
  if (!path) {
    console.error('Plugin path is required.')
    process.exit(1)
  }
  validatePlugin(path)
} else if (command === 'dev') {
  const name = args.find((arg) => !arg.startsWith('--') && arg !== 'dev')
  if (!name) {
    console.error('Plugin name is required.')
    process.exit(1)
  }

  const pluginDir = join(process.cwd(), 'src/plugins/examples', name)
  if (!existsSync(pluginDir)) {
    console.error(`Plugin "${name}" not found.`)
    process.exit(1)
  }

  console.log(`Starting development mode for plugin: ${name}`)
  const dev = spawn('pnpm', ['dev'], {
    cwd: pluginDir,
    stdio: 'inherit',
  })
} else {
  console.error(`Unknown command: ${command}`)
  showHelp()
  process.exit(1)
}
