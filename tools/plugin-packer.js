#!/usr/bin/env node
/**
 * Fleet Chat Plugin Packaging CLI
 *
 * A CLI tool for packaging Raycast plugins as distributable .fcp files
 * that can be directly loaded by Fleet Chat.
 */
import { Command } from 'commander';
import { resolve, join, basename, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { create } from 'archiver';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const program = new Command();
class PluginPackager {
    constructor(pluginDir, outFile) {
        this.pluginDir = resolve(pluginDir);
        this.outFile = resolve(outFile);
        this.tempDir = join(this.pluginDir, '.fleet-pack');
    }
    /**
     * Build and package the plugin
     */
    async package() {
        console.log(`📦 Packaging plugin from ${this.pluginDir}`);
        try {
            // Clean temp directory
            this.cleanTemp();
            // Create temp directory
            mkdirSync(this.tempDir, { recursive: true });
            // Read and validate package.json
            const packageJson = this.readPackageJson();
            const manifest = this.extractManifest(packageJson);
            // Build the plugin
            console.log('🔨 Building plugin...');
            this.buildPlugin();
            // Copy built files
            this.copyBuiltFiles();
            // Copy assets
            this.copyAssets();
            // Create plugin metadata
            const metadata = this.createMetadata(manifest);
            // Write manifest and metadata
            this.writeManifestFiles(manifest, metadata);
            // Create compressed package
            await this.createCompressedPackage();
            // Clean up
            this.cleanTemp();
            console.log(`✅ Plugin packaged successfully: ${this.outFile}`);
            console.log(`📊 Package size: ${this.getFileSize(this.outFile)}`);
        }
        catch (error) {
            this.cleanTemp();
            console.error('❌ Failed to package plugin:', error.message);
            process.exit(1);
        }
    }
    /**
     * Read and validate package.json
     */
    readPackageJson() {
        const packageJsonPath = join(this.pluginDir, 'package.json');
        if (!existsSync(packageJsonPath)) {
            throw new Error('package.json not found in plugin directory');
        }
        try {
            return JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        }
        catch (error) {
            throw new Error(`Invalid package.json: ${error.message}`);
        }
    }
    /**
     * Extract Fleet Chat manifest from package.json
     */
    extractManifest(packageJson) {
        const requiredFields = ['name', 'version', 'description', 'author'];
        for (const field of requiredFields) {
            if (!packageJson[field]) {
                throw new Error(`Missing required field '${field}' in package.json`);
            }
        }
        // Extract commands from package.json or default to empty array
        const commands = packageJson.commands || [];
        // Validate commands
        for (const command of commands) {
            const requiredCommandFields = ['name', 'title', 'description', 'mode'];
            for (const field of requiredCommandFields) {
                if (!command[field]) {
                    throw new Error(`Missing required field '${field}' in command`);
                }
            }
            if (!['no-view', 'view'].includes(command.mode)) {
                throw new Error(`Invalid command mode '${command.mode}', must be 'no-view' or 'view'`);
            }
        }
        return {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            author: packageJson.author,
            icon: packageJson.icon,
            readme: packageJson.readme,
            commands,
            dependencies: packageJson.dependencies,
            permissions: packageJson.permissions
        };
    }
    /**
     * Build the plugin using existing build system
     */
    buildPlugin() {
        try {
            // Check if there's a build script
            const packageJson = JSON.parse(readFileSync(join(this.pluginDir, 'package.json'), 'utf-8'));
            if (packageJson.scripts?.build) {
                // Run npm build
                execSync('npm run build', { cwd: this.pluginDir, stdio: 'inherit' });
            }
            else {
                // Default build process - compile TypeScript
                console.log('📝 Compiling TypeScript...');
                execSync('npx tsc', { cwd: this.pluginDir, stdio: 'inherit' });
            }
        }
        catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }
    /**
     * Copy built JavaScript files
     */
    copyBuiltFiles() {
        const distDir = join(this.pluginDir, 'dist');
        const outDistDir = join(this.tempDir, 'dist');
        if (existsSync(distDir)) {
            this.copyDirectory(distDir, outDistDir);
        }
        else {
            // Look for compiled JS files in src directory
            const srcDir = join(this.pluginDir, 'src');
            if (existsSync(srcDir)) {
                this.copyDirectory(srcDir, outDistDir);
            }
        }
        // Create main plugin entry point
        const mainEntry = join(this.tempDir, 'plugin.js');
        const srcEntry = join(this.pluginDir, 'src', 'index.ts');
        if (existsSync(srcEntry)) {
            // Compile and copy the main entry
            try {
                const compiled = execSync(`npx tsc --outDir ${this.tempDir} --target es2020 --module esnext ${srcEntry}`, { encoding: 'utf-8' });
                const jsFile = join(this.tempDir, 'src', 'index.js');
                if (existsSync(jsFile)) {
                    writeFileSync(mainEntry, readFileSync(jsFile));
                }
            }
            catch (error) {
                console.warn('Warning: Could not compile main entry point');
            }
        }
    }
    /**
     * Copy static assets
     */
    copyAssets() {
        const assetsDir = join(this.pluginDir, 'assets');
        const outAssetsDir = join(this.tempDir, 'assets');
        if (existsSync(assetsDir)) {
            this.copyDirectory(assetsDir, outAssetsDir);
        }
        // Copy icon if specified
        const packageJson = JSON.parse(readFileSync(join(this.pluginDir, 'package.json'), 'utf-8'));
        if (packageJson.icon) {
            const iconPath = resolve(this.pluginDir, packageJson.icon);
            if (existsSync(iconPath)) {
                writeFileSync(join(this.tempDir, 'icon.png'), readFileSync(iconPath));
            }
        }
    }
    /**
     * Create plugin metadata
     */
    createMetadata(manifest) {
        return {
            manifest,
            checksum: '', // Will be calculated after package creation
            buildTime: new Date().toISOString(),
            fleetChatVersion: this.getFleetChatVersion()
        };
    }
    /**
     * Write manifest and metadata files
     */
    writeManifestFiles(manifest, metadata) {
        // Write manifest.json
        writeFileSync(join(this.tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        // Write metadata.json
        writeFileSync(join(this.tempDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    }
    /**
     * Create compressed package
     */
    createCompressedPackage() {
        return new Promise((resolve, reject) => {
            const output = create('zip');
            const destination = require('fs').createWriteStream(this.outFile);
            output.pipe(destination);
            output.on('end', () => {
                // Calculate and update checksum
                const checksum = this.calculateChecksum(this.outFile);
                const metadata = JSON.parse(readFileSync(join(this.tempDir, 'metadata.json'), 'utf-8'));
                metadata.checksum = checksum;
                writeFileSync(join(this.tempDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
                // Recreate package with checksum
                this.recreatePackageWithChecksum();
                resolve();
            });
            output.on('error', reject);
            // Add all files from temp directory
            this.addFilesToArchive(output, this.tempDir);
            output.finalize();
        });
    }
    /**
     * Recreate package with updated checksum
     */
    recreatePackageWithChecksum() {
        return new Promise((resolve, reject) => {
            const output = create('zip');
            const destination = require('fs').createWriteStream(this.outFile);
            output.pipe(destination);
            output.on('end', resolve);
            output.on('error', reject);
            this.addFilesToArchive(output, this.tempDir);
            output.finalize();
        });
    }
    /**
     * Add files to archive
     */
    addFilesToArchive(archive, dir, relativePath = '') {
        const files = readdirSync(dir);
        for (const file of files) {
            const filePath = join(dir, file);
            const stat = statSync(filePath);
            const relative = join(relativePath, file);
            if (stat.isDirectory()) {
                this.addFilesToArchive(archive, filePath, relative);
            }
            else {
                archive.append(readFileSync(filePath), { name: relative });
            }
        }
    }
    /**
     * Calculate SHA256 checksum of file
     */
    calculateChecksum(filePath) {
        const fileBuffer = readFileSync(filePath);
        const hash = createHash('sha256');
        hash.update(fileBuffer);
        return hash.digest('hex');
    }
    /**
     * Get Fleet Chat version
     */
    getFleetChatVersion() {
        try {
            const packageJsonPath = resolve(__dirname, '../../package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.version || '1.0.0';
        }
        catch {
            return '1.0.0';
        }
    }
    /**
     * Copy directory recursively
     */
    copyDirectory(src, dest) {
        if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
        }
        const files = readdirSync(src);
        for (const file of files) {
            const srcPath = join(src, file);
            const destPath = join(dest, file);
            const stat = statSync(srcPath);
            if (stat.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            }
            else {
                writeFileSync(destPath, readFileSync(srcPath));
            }
        }
    }
    /**
     * Clean temporary directory
     */
    cleanTemp() {
        if (existsSync(this.tempDir)) {
            execSync(`rm -rf ${this.tempDir}`);
        }
    }
    /**
     * Get human readable file size
     */
    getFileSize(filePath) {
        const stats = statSync(filePath);
        const bytes = stats.size;
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
// CLI Commands
program
    .name('fleet-pack')
    .description('CLI tool for packaging Fleet Chat plugins')
    .version('1.0.0');
program
    .command('package')
    .description('Package a Raycast plugin as a distributable .fcp file')
    .argument('<plugin-dir>', 'Directory containing the plugin source code')
    .argument('[output-file]', 'Output file path (default: <plugin-name>.fcp)')
    .option('-v, --verbose', 'Verbose output')
    .action(async (pluginDir, outputFile, options) => {
    const pluginName = basename(pluginDir);
    const outFile = outputFile || `${pluginName}.fcp`;
    const packager = new PluginPackager(pluginDir, outFile);
    await packager.package();
});
program
    .command('install')
    .description('Install a plugin package')
    .argument('<package>', 'Path or URL to the .fcp package file')
    .option('-g, --global', 'Install globally (for all users)')
    .action(async (packagePath, options) => {
    console.log('📥 Installing plugin package...');
    // TODO: Implement installation logic
    console.log('Installation command not yet implemented');
});
program
    .command('list')
    .description('List installed plugins')
    .action(() => {
    console.log('📋 Installed plugins:');
    // TODO: Implement listing logic
    console.log('Listing command not yet implemented');
});
program
    .command('remove')
    .description('Remove an installed plugin')
    .argument('<plugin-name>', 'Name of the plugin to remove')
    .action((pluginName) => {
    console.log(`🗑️  Removing plugin: ${pluginName}`);
    // TODO: Implement removal logic
    console.log('Remove command not yet implemented');
});
program.parse();
