#!/usr/bin/env node

/**
 * Fleet Chat Plugin CLI
 *
 * Command-line interface for creating and managing Fleet Chat plugins
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

// Fix for Node.js ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TEMPLATE = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'A Fleet Chat plugin',
  author: 'Fleet Chat Developer',
  commands: [
    {
      name: 'default',
      title: 'Hello World',
      description: 'Shows a greeting message',
      mode: 'view'
    }
  ],
  icon: '🚀'
};

function createPlugin(name, options = {}) {
  const pluginDir = join(process.cwd(), 'src/plugins/examples', name);

  if (existsSync(pluginDir) && !options.force) {
    console.error(`Plugin directory ${pluginDir} already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  console.log(`Creating plugin: ${name}`);

  // Create plugin directory
  mkdirSync(pluginDir, { recursive: true });
  mkdirSync(join(pluginDir, 'src'), { recursive: true });

  // Generate simplified plugin package.json
  const packageJson = {
    name: name,
    version: "1.0.0",
    description: `${name} plugin for Fleet Chat`,
    author: "Fleet Chat Developer",
    commands: [
      {
        name: "default",
        title: name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: `${name} plugin functionality`,
        mode: "view"
      }
    ],
    icon: "🚀"
  };

  writeFileSync(
    join(pluginDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate tsconfig.json
  const tsconfig = {
    extends: "../../../tsconfig.json",
    compilerOptions: {
      module: "ESNext",
      target: "ES2020",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      jsx: "react-jsx",
      jsxImportSource: "@fleet-chat/raycast-api",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      moduleResolution: "node",
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      baseUrl: ".",
      composite: true,
      incremental: true,
      paths: {
        "@/*": ["src/*"],
        "@raycast/api": ["./node_modules/@fleet-chat/raycast-api"],
        "@fleet-chat/api": ["./node_modules/@fleet-chat/api"]
      }
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "build"]
  };

  writeFileSync(
    join(pluginDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Generate example plugin code using new simplified system
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
          type: 'ActionPanel',
          props: {
            actions: [
              {
                type: 'Action',
                props: {
                  title: "Select Item",
                  icon: "✅",
                  onAction: () => {
                    showToast({
                      title: "Selected",
                      message: \`You selected \${item.title}\`,
                      style: "success"
                    });
                  }
                }
              },
              {
                type: 'Action',
                props: {
                  title: "More Info",
                  icon: "ℹ️",
                  onAction: () => {
                    showToast({
                      title: "Item Info",
                      message: \`Keywords: \${item.keywords.join(', ')}\`,
                      style: "info"
                    });
                  }
                }
              }
            ]
          }
        }
      }))
    }
  };
}

export const utils = {
  formatGreeting: (name) => {
    return \`Hello, \${name}! Welcome to ${name} plugin.\`;
  },

  getRandomNumber: () => {
    return Math.floor(Math.random() * 1000);
  },

  getCurrentTime: () => {
    return new Date().toLocaleTimeString();
  }
};
`;

  writeFileSync(join(pluginDir, 'src', 'index.ts'), pluginCode);

  // Generate README
  const readme = `# ${name} Plugin

${packageJson.description}

## Commands

${packageJson.commands.map(cmd => `
### ${cmd.title}
\`\`\`
cmd.${cmd.name}()
\`\`\`
${cmd.description}
`).join('\n')}

## Usage

1. Navigate to this plugin directory:
   \`\`\`
cd src/plugins/examples/${name}
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

## Development

- Edit src/index.ts to modify plugin functionality
- Use Fleet Chat API components for UI
- Test changes with \`pnpm dev\`

## API Reference

- [Fleet Chat API Documentation](../../packages/fleet-chat-api/)
- [Raycast API Compatibility](../../packages/fleet-chat-api/raycast-api/)

## License

MIT
`;

  writeFileSync(join(pluginDir, 'README.md'), readme);

  console.log(`✅ Plugin "${name}" created successfully!`);
  console.log(`📁 Location: ${pluginDir}`);
  console.log(`\nNext steps:`);
  console.log(`  1. cd src/plugins/examples/${name}`);
  console.log(`  2. pnpm install`);
  console.log(`  3. pnpm dev`);
  console.log(`  4. Edit src/index.ts to customize your plugin`);
}

function listPlugins() {
  const pluginsDir = join(process.cwd(), 'src/plugins/examples');

  if (!existsSync(pluginsDir)) {
    console.log('No plugins directory found.');
    return;
  }

  const plugins = readdirSync(pluginsDir)
    .filter(dir => {
      const stat = statSync(join(pluginsDir, dir));
      return stat.isDirectory();
    });

  if (plugins.length === 0) {
    console.log('No plugins found.');
    return;
  }

  console.log('Available plugins:');
  plugins.forEach(plugin => {
    const manifestPath = join(pluginsDir, plugin, 'package.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        console.log(`  📦 ${plugin} - ${manifest.description}`);
        console.log(`     Commands: ${manifest.commands?.length || 0}`);
        console.log(`     Version: ${manifest.version}`);
        console.log();
      } catch (error) {
        console.log(`  📦 ${plugin} - (Unable to read manifest)`);
      }
    }
  });
}

function buildPlugin(name) {
  const pluginDir = join(process.cwd(), 'src/plugins/examples', name);

  if (!existsSync(pluginDir)) {
    console.error(`Plugin "${name}" not found in src/plugins/examples/`);
    process.exit(1);
  }

  console.log(`Building plugin: ${name}`);

  return new Promise((resolve, reject) => {
    const build = spawn('pnpm', ['build'], {
      cwd: pluginDir,
      stdio: 'inherit'
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Plugin "${name}" built successfully!`);
        resolve(code);
      } else {
        console.error(`❌ Plugin "${name}" build failed with code ${code}`);
        reject(code);
      }
    });
  });
}

function showHelp() {
  console.log(`
Fleet Chat Plugin CLI

Usage:
  pnpm plugin create <name>           Create a new plugin
  pnpm plugin list                    List all available plugins
  pnpm plugin build <name>            Build a specific plugin
  pnpm plugin dev <name>             Run plugin in development mode
  pnpm plugin clean <name>           Clean plugin build files

Options:
  --force                            Overwrite existing plugin
  --template <template>            Use a specific template

Examples:
  pnpm plugin create my-plugin
  pnpm plugin create my-plugin --force
  pnpm plugin list
  pnpm plugin build hello-world
  pnpm plugin dev hello-world

For more information, see: https://github.com/sternelee/fleet-chat/blob/main/WORKSPACE.md
`);
}

// CLI logic
const args = process.argv.slice(2);
const command = args[0];
const options = {
  force: args.includes('--force'),
  template: args.find(arg => arg.startsWith('--template='))?.split('=')[1]
};

if (!command || command === 'help') {
  showHelp();
} else if (command === 'create') {
  const name = args.find(arg => !arg.startsWith('--') && arg !== 'create');
  if (!name) {
    console.error('Plugin name is required.');
    process.exit(1);
  }
  createPlugin(name, options);
} else if (command === 'list') {
  listPlugins();
} else if (command === 'build') {
  const name = args.find(arg => !arg.startsWith('--') && arg !== 'build');
  if (!name) {
    console.error('Plugin name is required.');
    process.exit(1);
  }
  buildPlugin(name);
} else if (command === 'dev') {
  const name = args.find(arg => !arg.startsWith('--') && arg !== 'dev');
  if (!name) {
    console.error('Plugin name is required.');
    process.exit(1);
  }

  const pluginDir = join(process.cwd(), 'src/plugins/examples', name);
  if (!existsSync(pluginDir)) {
    console.error(`Plugin "${name}" not found.`);
    process.exit(1);
  }

  console.log(`Starting development mode for plugin: ${name}`);
  const dev = spawn('pnpm', ['dev'], {
    cwd: pluginDir,
    stdio: 'inherit'
  });
} else {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}
