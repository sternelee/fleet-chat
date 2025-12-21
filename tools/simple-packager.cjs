#!/usr/bin/env node

/**
 * Simple Fleet Chat Plugin Packer
 *
 * A simplified packager that converts Raycast plugins to Fleet Chat plugins
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const crypto = require('crypto');

class SimplePluginPacker {
  constructor() {
    this.zip = new JSZip();
  }

  async pack(pluginPath, outputPath) {
    console.log(`🚀 Starting to pack plugin: ${pluginPath}`);

    try {
      // Read package.json
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Create manifest for Fleet Chat
      const manifest = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        author: packageJson.author,
        commands: packageJson.commands.map(cmd => ({
          name: cmd.name,
          title: cmd.title,
          description: cmd.description,
          mode: cmd.mode
        })),
        icon: packageJson.icon,
        license: packageJson.license,
        categories: packageJson.categories,
        preferences: packageJson.preferences
      };

      // Add manifest to zip
      this.zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // Process source files
      const srcPath = path.join(pluginPath, 'src');
      if (fs.existsSync(srcPath)) {
        await this.processDirectory(srcPath, 'src');
      }

      // Process assets
      const assetsPath = path.join(pluginPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        await this.processDirectory(assetsPath, 'assets');
      }

      // Generate zip
      const zipBuffer = await this.zip.generateAsync({ type: 'nodebuffer' });

      // Create metadata
      const metadata = {
        manifest,
        checksum: this.calculateChecksum(zipBuffer),
        buildTime: new Date().toISOString(),
        fleetChatVersion: '1.0.0',
        raycastVersion: '1.104.1',
        transformation: {
          reactToLit: true,
          compiler: 'simple-packager',
          timestamp: new Date().toISOString()
        }
      };

      // Add metadata and regenerate
      this.zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      const finalBuffer = await this.zip.generateAsync({ type: 'nodebuffer' });

      // Write output
      fs.writeFileSync(outputPath, finalBuffer);

      console.log(`✅ Plugin packed successfully: ${outputPath}`);
      console.log(`📋 Package size: ${(finalBuffer.byteLength / 1024).toFixed(2)} KB`);

    } catch (error) {
      console.error('❌ Failed to pack plugin:', error);
      throw error;
    }
  }

  async processDirectory(dirPath, zipPath) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      const relativePath = path.join(zipPath, file.name);

      if (file.isDirectory()) {
        await this.processDirectory(fullPath, relativePath);
      } else {
        const content = fs.readFileSync(fullPath);

        // Convert React components
        if (file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) {
          console.log(`🔄 Converting ${file.name}...`);
          const converted = this.convertReactComponent(content.toString(), file.name);
          this.zip.file(relativePath.replace(/\.(tsx|jsx)$/, '.ts'), converted);
        } else {
          this.zip.file(relativePath, content);
        }
      }
    }
  }

  convertReactComponent(content, fileName) {
    let converted = content;

    // Update imports
    converted = converted.replace(
      /from\s+['"]@raycast\/api['"]/g,
      "from '@fleet-chat/api/raycast-compat'"
    );

    // Convert default function exports to Lit classes
    const functionMatch = converted.match(/export\s+default\s+function\s+(\w+)/);
    if (functionMatch) {
      const componentName = functionMatch[1];

      converted = converted.replace(
        /export\s+default\s+function\s+(\w+)/,
        `@customElement('${componentName.toLowerCase()}')\nclass ${componentName} extends LitElement {`
      );

      // Convert JSX to html templates
      converted = converted.replace(/return\s*\(/g, 'return html`');
      converted = converted.replace(/\)\s*;?\s*$/g, '`;');

      // Add Lit imports at the top
      converted = `import { LitElement, html, css } from 'lit';\nimport { customElement, property } from 'lit/decorators.js';\n\n${converted}`;

      // Add styles
      const styles = `\n  static styles = css\`\n    :host {\n      display: block;\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    }\n  \`;\n\n`;

      // Insert styles after class declaration
      converted = converted.replace(/class\s+\w+\s+extends\s+LitElement\s*{/, `class ${componentName} extends LitElement {${styles}`);

      // Add default export
      converted += `\n\nexport default ${componentName};`;

      // Basic state management conversion
      converted = converted.replace(
        /const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\(([^)]*)\);/g,
        '@property() $1: $2 = $3;'
      );

      // Basic effect conversion
      converted = converted.replace(
        /useEffect\(\s*\(\s*\)\s*=>\s*{([^}]+)}\s*,\s*\[([^\]]*)\]\s*\);/g,
        'firstUpdated() { $1 }'
      );
    }

    // Convert React component calls to Lit elements
    converted = converted.replace(/<List/g, '<fleet-list');
    converted = converted.replace(/<\/List>/g, '</fleet-list>');
    converted = converted.replace(/<List\.Item/g, '<fleet-list-item');
    converted = converted.replace(/<\/List\.Item>/g, '</fleet-list-item>');
    converted = converted.replace(/<ActionPanel/g, '<fleet-action-panel');
    converted = converted.replace(/<\/ActionPanel>/g, '</fleet-action-panel>');
    converted = converted.replace(/<ActionPanel\.Item/g, '<fleet-action');
    converted = converted.replace(/<\/ActionPanel\.Item>/g, '</fleet-action>');
    converted = converted.replace(/<Detail/g, '<fleet-detail');
    converted = converted.replace(/<\/Detail>/g, '</fleet-detail>');

    // Convert properties
    converted = converted.replace(/title=/g, 'title=');
    converted = converted.replace(/subtitle=/g, 'subtitle=');
    converted = converted.replace(/actions=/g, 'actions=');
    converted = converted.replace(/icon=/g, 'icon=');

    // Convert event handlers
    converted = converted.replace(/onAction={(\w+)}/g, '@action="${$1}"');
    converted = converted.replace(/onClick={(\w+)}/g, '@click="${$1}"');

    return converted;
  }

  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// CLI implementation
async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: node simple-packager.cjs <plugin-path> <output-path>');
    process.exit(1);
  }

  const [pluginPath, outputPath] = args;

  const packer = new SimplePluginPacker();
  await packer.pack(pluginPath, outputPath);
}

if (require.main === module) {
  main().catch(console.error);
}