#!/usr/bin/env ts-node
/**
 * Enhanced Fleet Chat Plugin Packer with React-to-Lit Conversion
 *
 * A comprehensive CLI tool that converts Raycast plugins to Fleet Chat plugins
 * by packaging them with React-to-Lit transformation
 */
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as JSZip from 'jszip';
import { createHash } from 'crypto';
import { RaycastToLitConverter } from './react-to-lit-converter.js';
class FleetChatPluginPacker {
    constructor() {
        this.converter = new RaycastToLitConverter();
    }
    /**
     * Package a Raycast plugin for Fleet Chat
     */
    async package(pluginPath, outputPath) {
        try {
            console.log(`🚀 Starting to package plugin: ${pluginPath}`);
            // Validate plugin path
            if (!await this.directoryExists(pluginPath)) {
                throw new Error(`Plugin path does not exist: ${pluginPath}`);
            }
            // Read and validate package.json
            const packageJsonPath = path.join(pluginPath, 'package.json');
            const packageJson = await this.readPackageJson(packageJsonPath);
            // Create plugin manifest
            const manifest = this.createManifest(packageJson);
            // Convert React components to Lit
            console.log('🔄 Converting React components to Lit...');
            const convertedFiles = await this.convertPluginFiles(pluginPath);
            // Create the plugin package
            console.log('📦 Creating plugin package...');
            const packageBuffer = await this.createPackage(manifest, convertedFiles, pluginPath);
            // Write the package file
            await fs.writeFile(outputPath, packageBuffer);
            console.log(`✅ Plugin successfully packaged: ${outputPath}`);
            console.log(`📋 Package size: ${(packageBuffer.byteLength / 1024).toFixed(2)} KB`);
        }
        catch (error) {
            console.error('❌ Failed to package plugin:', error);
            throw error;
        }
    }
    /**
     * Convert all plugin files from React to Lit
     */
    async convertPluginFiles(pluginPath) {
        const srcPath = path.join(pluginPath, 'src');
        const convertedFiles = new Map();
        if (await this.directoryExists(srcPath)) {
            // Use the converter's directory conversion method
            const tempDir = path.join(pluginPath, '.fleet-temp');
            await this.converter.convertDirectory(srcPath, tempDir, {
                preserveImports: false,
                addTypeAnnotations: true,
                includeStyles: true
            });
            // Read converted files
            const files = await this.getAllFiles(tempDir);
            for (const file of files) {
                const relativePath = path.relative(tempDir, file);
                const content = await fs.readFile(file, 'utf-8');
                convertedFiles.set(relativePath, content);
            }
            // Clean up temp directory
            await fs.rmdir(tempDir, { recursive: true });
        }
        return convertedFiles;
    }
    /**
     * Create the plugin package ZIP
     */
    async createPackage(manifest, convertedFiles, pluginPath) {
        const zip = new JSZip();
        // Add manifest
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        // Add converted source files
        const srcFolder = zip.folder('src');
        for (const [relativePath, content] of convertedFiles) {
            srcFolder?.file(relativePath, content);
        }
        // Add assets if they exist
        const assetsPath = path.join(pluginPath, 'assets');
        if (await this.directoryExists(assetsPath)) {
            const assetsFolder = zip.folder('assets');
            const assetFiles = await this.getAllFiles(assetsPath);
            for (const assetFile of assetFiles) {
                const relativePath = path.relative(assetsPath, assetFile);
                const content = await fs.readFile(assetFile);
                assetsFolder?.file(relativePath, content);
            }
        }
        // Create metadata
        const metadata = {
            manifest,
            checksum: '', // Will be calculated after ZIP creation
            buildTime: new Date().toISOString(),
            fleetChatVersion: '1.0.0',
            raycastVersion: '1.104.1',
            transformation: {
                reactToLit: true,
                compiler: '@lit/react',
                timestamp: new Date().toISOString()
            }
        };
        // Generate ZIP without metadata first
        const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
        // Calculate checksum
        metadata.checksum = this.calculateChecksum(zipBuffer);
        // Add metadata and regenerate ZIP
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        return await zip.generateAsync({ type: 'nodebuffer' });
    }
    createManifest(packageJson) {
        return {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            author: packageJson.author,
            commands: packageJson.commands.map((cmd) => ({
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
    }
    async readPackageJson(packageJsonPath) {
        try {
            const content = await fs.readFile(packageJsonPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            throw new Error(`Failed to read package.json: ${error}`);
        }
    }
    async directoryExists(path) {
        try {
            const stat = await fs.stat(path);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
    async getAllFiles(dirPath) {
        const files = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                files.push(...await this.getAllFiles(fullPath));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
    calculateChecksum(data) {
        return createHash('sha256').update(data).digest('hex');
    }
}
// CLI Implementation
const program = new Command();
program
    .name('fleet-pack-enhanced')
    .description('Enhanced Fleet Chat Plugin Packer with React-to-Lit conversion')
    .version('2.0.0');
program
    .command('package')
    .description('Package a Raycast plugin for Fleet Chat')
    .argument('<plugin-path>', 'Path to the Raycast plugin directory')
    .argument('<output-path>', 'Output path for the .fcp file')
    .option('-v, --verbose', 'Verbose output')
    .action(async (pluginPath, outputPath, options) => {
    if (options.verbose) {
        console.log('🔧 Enhanced Fleet Chat Plugin Packer v2.0.0');
        console.log(`📂 Plugin path: ${pluginPath}`);
        console.log(`📤 Output path: ${outputPath}`);
    }
    const packer = new FleetChatPluginPacker();
    await packer.package(pluginPath, outputPath);
});
program
    .command('convert')
    .description('Convert a React component file to Lit')
    .argument('<input-file>', 'Input React component file')
    .argument('<output-file>', 'Output Lit component file')
    .action(async (inputFile, outputFile) => {
    console.log(`🔄 Converting ${inputFile} to ${outputFile}...`);
    const converter = new RaycastToLitConverter();
    const converted = await converter.convertComponent(inputFile, {
        preserveImports: false,
        addTypeAnnotations: true,
        includeStyles: true
    });
    await fs.writeFile(outputFile, converted);
    console.log(`✅ Conversion complete: ${outputFile}`);
});
// Parse command line arguments
if (require.main === module) {
    program.parse();
}
export { FleetChatPluginPacker, RaycastToLitConverter };
