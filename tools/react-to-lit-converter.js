/**
 * Raycast React-to-Lit Converter
 *
 * Specialized converter that transforms Raycast React components
 * into Fleet Chat Lit components
 */
import * as fs from 'fs/promises';
import * as path from 'path';
class RaycastToLitConverter {
    constructor() {
        this.componentMap = new Map();
        this.initializeComponentMap();
    }
    initializeComponentMap() {
        // Map Raycast components to Fleet Chat equivalents
        this.componentMap.set('List', 'FleetList');
        this.componentMap.set('List.Item', 'FleetListItem');
        this.componentMap.set('ActionPanel', 'FleetActionPanel');
        this.componentMap.set('ActionPanel.Item', 'FleetAction');
        this.componentMap.set('Detail', 'FleetDetail');
        this.componentMap.set('Form', 'FleetForm');
        this.componentMap.set('Form.TextField', 'FleetFormTextField');
        this.componentMap.set('Form.TextArea', 'FleetFormTextArea');
        this.componentMap.set('Form.Dropdown', 'FleetFormDropdown');
        this.componentMap.set('Form.Checkbox', 'FleetFormCheckbox');
        this.componentMap.set('Form.DateField', 'FleetFormDateField');
        this.componentMap.set('Form.Separator', 'FleetFormSeparator');
        this.componentMap.set('Icon', 'FleetIcon');
        this.componentMap.set('Image', 'FleetImage');
        this.componentMap.set('Keyboard', 'FleetKeyboard');
    }
    /**
     * Convert a React component file to Lit component
     */
    async convertComponent(filePath, options = {}) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        if (!['.tsx', '.jsx'].includes(ext)) {
            return content; // Return non-React files as-is
        }
        // Parse and convert the component
        const converted = await this.parseAndConvert(content, options);
        return this.wrapAsLitClass(converted, filePath);
    }
    async parseAndConvert(content, options) {
        let converted = content;
        // 1. Update imports
        converted = this.updateImports(converted, options);
        // 2. Convert React hooks to Lit decorators
        converted = this.convertHooks(converted);
        // 3. Convert JSX to HTML templates
        converted = this.convertJSX(converted);
        // 4. Convert event handlers
        converted = this.convertEventHandlers(converted);
        // 5. Convert props and state
        converted = this.convertPropsAndState(converted);
        // 6. Add styles
        if (options.includeStyles) {
            converted = this.addStyles(converted);
        }
        return converted;
    }
    updateImports(content, options) {
        let updated = content;
        // Replace @raycast/api imports with Fleet Chat equivalents
        updated = updated.replace(/from\s+['"]@raycast\/api['"]/g, "from '@fleet-chat/api/raycast-compat'");
        // Remove React imports since we're using Lit
        if (!options.preserveImports) {
            updated = updated.replace(/import\s+(React|{.*?React.*?})\s+from\s+['"]react['"];?\s*/g, '');
        }
        return updated;
    }
    convertHooks(content) {
        let converted = content;
        // Convert useState to @property
        converted = converted.replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState<([^>]+)>\(([^)]*)\);?/g, '@property() $1: $2 = $4;');
        converted = converted.replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\(([^)]*)\);?/g, '@property() $1: $2 = $3;');
        // Convert useEffect to lifecycle methods
        converted = converted.replace(/useEffect\(\s*\(\s*\)\s*=>\s*{([^}]+)}\s*,\s*\[([^\]]*)\]\s*\);?/g, 'firstUpdated() { $1 }');
        converted = converted.replace(/useEffect\(\s*\(\s*\)\s*=>\s*{([^}]+)}\s*\);?/g, 'firstUpdated() { $1 }');
        return converted;
    }
    convertJSX(content) {
        let converted = content;
        // Convert JSX tags to html template literals
        // Simple heuristic: look for JSX-like patterns
        converted = converted.replace(/return\s*\(/g, 'return html`');
        converted = converted.replace(/\)\s*;?\s*$/g, '`;');
        // Convert nested JSX to html template
        converted = this.convertNestedJSX(converted);
        // Convert component properties
        converted = this.convertComponentProps(converted);
        return converted;
    }
    convertNestedJSX(content) {
        // This is a simplified converter - in practice you'd use a proper AST parser
        let converted = content;
        // Convert <List> to <fleet-list>
        for (const [reactComponent, litComponent] of this.componentMap) {
            const reactTag = `<${reactComponent}`;
            const litTag = `<${litComponent.toLowerCase()}`;
            converted = converted.replace(new RegExp(reactTag.replace('.', '\\.'), 'g'), litTag);
        }
        // Convert self-closing tags
        converted = converted.replace(/<(\w+)([^>]*?)\/>/g, '<$1$2></$1>');
        // Convert className to class
        converted = converted.replace(/className=/g, 'class=');
        // Convert onClick to @click
        converted = converted.replace(/onClick=/g, '@click=');
        // Convert onChange to @change
        converted = converted.replace(/onChange=/g, '@change=');
        return converted;
    }
    convertComponentProps(content) {
        let converted = content;
        // Convert React-style props to Lit attributes
        converted = converted.replace(/(\w+)={([^}]+)}/g, '$1="$2"');
        // Handle function calls in props
        converted = converted.replace(/(\w+)={(\w+)}/g, '$1="${$2}"');
        return converted;
    }
    convertEventHandlers(content) {
        let converted = content;
        // Convert arrow function handlers
        converted = converted.replace(/@click="{\(\)\s*=>\s*([^}]+)}"/g, '@click="${() => this.$1}"');
        // Convert method references
        converted = converted.replace(/@click="{(\w+)}"/g, '@click="${this.$1}"');
        return converted;
    }
    convertPropsAndState(content) {
        let converted = content;
        // Convert prop destructuring
        converted = converted.replace(/const\s+{\s*([^}]+)\s*}\s*=\s*props;/g, 
        // This would need more sophisticated handling in practice
        '');
        // Convert state setters
        converted = converted.replace(/set(\w+)\(([^)]+)\)/g, 'this.$1 = $2');
        return converted;
    }
    addStyles(content) {
        const styles = `
  static styles = css\`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    fleet-list {
      display: block;
    }

    fleet-list-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    fleet-action-panel {
      display: flex;
      flex-direction: column;
    }

    fleet-action {
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
    }

    fleet-action:hover {
      background-color: var(--hover-bg-color);
    }
  \`;
`;
        // Insert styles before the class declaration
        const classMatch = content.match(/class\s+\w+\s+extends/);
        if (classMatch) {
            const insertPosition = content.indexOf(classMatch[0]);
            return content.slice(0, insertPosition) + styles + content.slice(insertPosition);
        }
        return styles + content;
    }
    wrapAsLitClass(content, filePath) {
        // Extract component name from file path
        const fileName = path.basename(filePath, path.extname(filePath));
        const componentName = this.toPascalCase(fileName);
        // Create Lit class wrapper
        const litWrapper = `
/**
 * Converted Raycast Component: ${fileName}
 * Generated by Fleet Chat React-to-Lit Converter
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('${componentName.toLowerCase()}')
class ${componentName} extends LitElement {
  ${content}
}

export default ${componentName};
`;
        return litWrapper;
    }
    toPascalCase(str) {
        return str
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }
    /**
     * Convert an entire directory of React components
     */
    async convertDirectory(inputDir, outputDir, options = {}) {
        const files = await this.getAllFiles(inputDir);
        for (const file of files) {
            if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                console.log(`🔄 Converting ${file}...`);
                const relativePath = path.relative(inputDir, file);
                const outputPath = path.join(outputDir, relativePath.replace(/\.(tsx|jsx)$/, '.ts'));
                // Ensure output directory exists
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                const converted = await this.convertComponent(file, options);
                await fs.writeFile(outputPath, converted);
                console.log(`✅ Converted to ${outputPath}`);
            }
        }
    }
    async getAllFiles(dir) {
        const files = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this.getAllFiles(fullPath));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
}
export { RaycastToLitConverter };
