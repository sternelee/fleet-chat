#!/usr/bin/env node

/**
 * Test script for the Fleet Chat plugin packaging system
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

const testPluginPath = resolve(__dirname, '../src/plugins/examples/test-plugin');
const outputPath = resolve(__dirname, '../test-plugin.fcp');

console.log('🧪 Testing Fleet Chat Plugin Packaging System\n');

// Test 1: Check if test plugin exists
console.log('1. Checking test plugin...');
if (!existsSync(testPluginPath)) {
  console.error('❌ Test plugin not found');
  process.exit(1);
}
console.log('✅ Test plugin found\n');

// Test 2: Build the test plugin
console.log('2. Building test plugin...');
try {
  process.chdir(testPluginPath);
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Plugin built successfully\n');
} catch (error) {
  console.error('❌ Failed to build plugin');
  console.error('Make sure dependencies are installed:');
  console.error(`  cd ${testPluginPath}`);
  console.error('  npm install');
  process.exit(1);
}

// Test 3: Package the plugin
console.log('3. Packaging plugin...');
try {
  process.chdir(resolve(__dirname));
  execSync(`node plugin-packer.ts package ${testPluginPath} ${outputPath}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--loader ts-node/esm'
    }
  });
  console.log('✅ Plugin packaged successfully\n');
} catch (error) {
  console.error('❌ Failed to package plugin');
  console.error('Make sure dependencies are installed:');
  console.error('  cd tools');
  console.error('  npm install');
  process.exit(1);
}

// Test 4: Verify the package
console.log('4. Verifying package...');
if (!existsSync(outputPath)) {
  console.error('❌ Package file not created');
  process.exit(1);
}

const stats = require('fs').statSync(outputPath);
console.log(`✅ Package created: ${outputPath}`);
console.log(`📊 Package size: ${(stats.size / 1024).toFixed(2)} KB\n`);

// Test 5: Show package contents
console.log('5. Package contents:');
try {
  execSync(`unzip -l ${outputPath}`, { stdio: 'inherit' });
  console.log('\n✅ Package structure verified\n');
} catch (error) {
  console.error('❌ Failed to list package contents');
  process.exit(1);
}

// Test 6: Instructions for loading
console.log('6. Loading instructions:');
console.log(`
To test loading this plugin in Fleet Chat:

1. Start Fleet Chat:
   pnpm dev

2. Open the browser console

3. Load the plugin programmatically:
   (Open the console and run)

   const { PluginLoader } = await import('/src/plugins/plugin-loader.js');
   const loader = new PluginLoader();
   await loader.loadPlugin('${outputPath.replace(/\\/g, '/')}')
     .then(() => console.log('✅ Plugin loaded successfully!'))
     .catch(err => console.error('❌ Failed to load plugin:', err));

4. Or use the UI:
   - Navigate to Settings
   - Click on "Plugins"
   - Click "Install Plugin"
   - Enter the path: ${outputPath}
   - Click "Install"

The plugin should appear in the plugin list and be available in the command palette.
`);

console.log('🎉 All tests completed successfully!');
console.log('\nNext steps:');
console.log('- Install dependencies if you haven\'t: cd tools && npm install');
console.log('- Run Fleet Chat: pnpm dev');
console.log('- Load the test plugin using the instructions above');