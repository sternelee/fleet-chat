#!/usr/bin/env node

/**
 * Test script for React-to-Lit conversion
 */

const fs = require('fs');
const path = require('path');

// Simple test conversion function
function convertReactComponent(content) {
  let converted = content;

  // Update imports
  converted = converted.replace(
    /from\s+['"]@raycast\/api['"]/g,
    "from '@fleet-chat/api/raycast-compat'"
  );

  // Convert basic React patterns to Lit
  converted = converted.replace(
    /export\s+default\s+function\s+(\w+)/g,
    '@customElement("$1".toLowerCase())\nclass $1 extends LitElement {'
  );

  // Convert JSX to html templates
  converted = converted.replace(
    /return\s*\(/g,
    'return html`'
  );

  converted = converted.replace(
    /\)\s*;?\s*$/g,
    '`;'
  );

  // Add necessary imports
  if (!converted.includes('import { LitElement')) {
    converted = 'import { LitElement, html, css } from \'lit\';\nimport { customElement, property } from \'lit/decorators.js\';\n\n' + converted;
  }

  // Add default export if needed
  if (converted.includes('class ') && !converted.includes('export default')) {
    converted += '\n\nexport default TodoList;';
  }

  return converted;
}

// Read the Raycast plugin file
const raycastFile = '/Users/sternelee/www/github/raycast-extension-todo-list/src/index.tsx';

try {
  const content = fs.readFileSync(raycastFile, 'utf-8');
  console.log('📖 Original Raycast component:');
  console.log('='.repeat(50));
  console.log(content.substring(0, 500) + '...');

  const converted = convertReactComponent(content);

  console.log('\n🔄 Converted Lit component:');
  console.log('='.repeat(50));
  console.log(converted.substring(0, 500) + '...');

  // Write converted file
  const outputFile = 'converted-todo.ts';
  fs.writeFileSync(outputFile, converted);

  console.log(`\n✅ Conversion complete! Output written to: ${outputFile}`);

} catch (error) {
  console.error('❌ Error:', error.message);
}