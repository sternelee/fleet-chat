#!/usr/bin/env node

/**
 * Simple Fleet Chat Plugin Packer
 *
 * Replaces the complex packaging system with a straightforward tool
 * that creates .fcp files from plugin source code
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join, relative, extname, basename } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

// 简化的日志记录
class SimpleLogger {
  info(message: string) { console.log(`ℹ️  ${message}`); }
  warn(message: string) { console.warn(`⚠️  ${message}`); }
  error(message: string, error?: Error) {
    console.error(`❌ ${message}`);
    if (error) console.error(error.stack);
  }
}

const logger = new SimpleLogger();

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  commands: Array<{
    name: string;
    title: string;
    description?: string;
    mode?: 'no-view' | 'view';
  }>;
  icon?: string;
  dependencies?: Record<string, string>;
}

interface PackOptions {
  input: string;
  output?: string;
  verbose?: boolean;
}

/**
 * Read plugin manifest from package.json or create from defaults
 */
function readPluginManifest(pluginDir: string): PluginManifest {
  const packageJsonPath = join(pluginDir, 'package.json');

  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Extract Fleet Chat specific fields from package.json
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || '',
      author: packageJson.author || '',
      commands: packageJson.commands || [],
      icon: packageJson.icon,
      dependencies: packageJson.dependencies,
    };
  }

  // Try to read from manifest.json
  const manifestJsonPath = join(pluginDir, 'manifest.json');
  if (existsSync(manifestJsonPath)) {
    return JSON.parse(readFileSync(manifestJsonPath, 'utf-8'));
  }

  throw new Error('No package.json or manifest.json found in plugin directory');
}

/**
 * Validate plugin structure
 */
function validatePluginStructure(pluginDir: string, manifest: PluginManifest): void {
  const srcDir = join(pluginDir, 'src');

  if (!existsSync(srcDir)) {
    throw new Error(`src directory not found in ${pluginDir}`);
  }

  const indexPath = join(srcDir, 'index.ts');
  if (!existsSync(indexPath)) {
    throw new Error(`src/index.ts not found in ${pluginDir}`);
  }

  // For new simplified system, commands should be exported from index.ts
  // Don't require separate command files
  console.log('Note: Commands should be exported from index.ts');

  console.log('✓ Plugin structure validation passed');
}

/**
 * Add file to archive with proper compression
 */
async function addFileToArchive(archive: any, filePath: string, archivePath: string): Promise<void> {
  const stats = statSync(filePath);

  if (stats.isDirectory()) {
    archive.directory(filePath, archivePath);
  } else {
    archive.file(filePath, { name: archivePath });
  }
}

/**
 * Create simplified plugin manifest
 */
function createPluginManifest(manifest: PluginManifest): any {
  return {
    name: manifest.name,
    version: manifest.version,
    title: manifest.description,
    author: manifest.author,
    commands: manifest.commands.map(cmd => ({
      name: cmd.name,
      title: cmd.title,
      description: cmd.description,
      mode: cmd.mode || 'view'
    })),
    icon: manifest.icon || '📦',
    dependencies: manifest.dependencies,
  };
}

/**
 * Pack plugin into .fcp file
 */
async function packPlugin(options: PackOptions): Promise<void> {
  try {
    const { input, output, verbose = false } = options;

    if (!existsSync(input)) {
      throw new Error(`Input directory not found: ${input}`);
    }

    const pluginDir = input;
    const pluginDirName = pluginDir === '.' ? basename(process.cwd()) : basename(pluginDir);
    const outputFile = output || `${pluginDirName}.fcp`;

    if (verbose) {
      logger.info(`Packing plugin from: ${pluginDir}`);
      logger.info(`Output file: ${outputFile}`);
    }

    await doPackPlugin(pluginDir, outputFile, verbose);
  } catch (error) {
    logger.error('Failed to pack plugin', error as Error);
    throw error;
  }
}

/**
 * 执行实际的打包操作
 */
async function doPackPlugin(pluginDir: string, outputFile: string, verbose: boolean): Promise<void> {
  const startTime = performance.now();

  // Read and validate manifest
  const manifest = readPluginManifest(pluginDir);
  validatePluginStructure(pluginDir, manifest);

  if (verbose) {
    logger.info(`Plugin: ${manifest.name} v${manifest.version}`);
    logger.info(`Commands: ${manifest.commands.map(c => c.name).join(', ')}`);
  }

  // Create output directory if it doesn't exist
  const outputDir = join(outputFile, '..');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Create archive
  const outputStream = createWriteStream(outputFile);
  const archiveInstance = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

  archiveInstance.pipe(outputStream);

  // Add plugin manifest
  const pluginManifest = createPluginManifest(manifest);
  archiveInstance.append(JSON.stringify(pluginManifest, null, 2), { name: 'plugin.json' });

  // Add source files
  const srcDir = join(pluginDir, 'src');
  await addFileToArchive(archiveInstance, srcDir, 'src');

  // Add assets if they exist
  const assetsDir = join(pluginDir, 'assets');
  if (existsSync(assetsDir)) {
    await addFileToArchive(archiveInstance, assetsDir, 'assets');
  }

  // Add package.json if it exists
  const packageJsonPath = join(pluginDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    archiveInstance.file(packageJsonPath, { name: 'package.json' });
  }

  // Finalize archive
  await archiveInstance.finalize();

  const endTime = performance.now();
  const stats = statSync(outputFile);
  const duration = endTime - startTime;

  logger.info(`✓ Plugin packed successfully: ${outputFile}`);
  logger.info(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
  logger.info(`  Time: ${duration.toFixed(2)}ms`);

  if (verbose) {
    const compressionRatio = (stats.size / 1024) / duration * 1000;
    logger.info(`  Compression rate: ${compressionRatio.toFixed(2)} KB/s`);
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Simple Fleet Chat Plugin Packer

Usage:
  simple-packer <plugin-directory> [output-file]
  simple-packer --help

Examples:
  simple-packer ./my-plugin
  simple-packer ./my-plugin my-plugin.fcp
  simple-packer --verbose ./my-plugin

Options:
  --verbose, -v  Show detailed packing information
  --help, -h     Show this help message
    `);
    process.exit(0);
  }

  const options: PackOptions = { input: '' };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!options.input) {
      options.input = arg;
    } else if (!options.output) {
      options.output = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      process.exit(1);
    }
  }

  try {
    await packPlugin(options);
  } catch (error) {
    console.error(`Error packing plugin: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { packPlugin, readPluginManifest, validatePluginStructure };