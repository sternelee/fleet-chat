#!/usr/bin/env node

/**
 * Fleet Chat Plugin Market Tools
 *
 * 插件发布和市场管理工具
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

export interface PluginMetadata {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  icon: string;
  screenshots?: string[];
  homepage?: string;
  repository?: string;
  license: string;
  size: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  reviewCount: number;
}

export interface MarketIndex {
  plugins: PluginMetadata[];
  categories: string[];
  tags: string[];
  lastUpdated: string;
  totalPlugins: number;
  totalDownloads: number;
}

class PluginMarket {
  private marketDir: string;
  private indexPath: string;

  constructor(marketDir = 'market') {
    this.marketDir = marketDir;
    this.indexPath = join(marketDir, 'index.json');
    this.ensureMarketDir();
  }

  private ensureMarketDir(): void {
    if (!existsSync(this.marketDir)) {
      mkdirSync(this.marketDir, { recursive: true });
    }
  }

  private calculateChecksum(filePath: string): string {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  private getFileSize(filePath: string): number {
    return statSync(filePath).size;
  }

  loadIndex(): MarketIndex {
    if (existsSync(this.indexPath)) {
      const content = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(content);
    }

    // 创建初始索引
    return {
      plugins: [],
      categories: [],
      tags: [],
      lastUpdated: new Date().toISOString(),
      totalPlugins: 0,
      totalDownloads: 0
    };
  }

  saveIndex(index: MarketIndex): void {
    index.lastUpdated = new Date().toISOString();
    index.totalPlugins = index.plugins.length;
    index.totalDownloads = index.plugins.reduce((sum, p) => sum + p.downloads, 0);

    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  addPlugin(pluginPath: string, options: {
    category?: string;
    tags?: string[];
    homepage?: string;
    repository?: string;
    screenshots?: string[];
  } = {}): void {
    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin file not found: ${pluginPath}`);
    }

    const index = this.loadIndex();
    const pluginName = basename(pluginPath, '.fcp');

    // 检查是否已存在
    const existingPlugin = index.plugins.find(p => p.name === pluginName);
    if (existingPlugin) {
      console.log(`Updating existing plugin: ${pluginName}`);
      return this.updatePlugin(pluginPath, options);
    }

    // 提取插件元数据
    const metadata = this.extractMetadata(pluginPath, options);

    // 添加到索引
    index.plugins.push(metadata);

    // 更新分类和标签
    if (!index.categories.includes(metadata.category)) {
      index.categories.push(metadata.category);
    }

    for (const tag of metadata.tags) {
      if (!index.tags.includes(tag)) {
        index.tags.push(tag);
      }
    }

    this.saveIndex(index);
    console.log(`✅ Plugin added to market: ${pluginName}`);
  }

  private extractMetadata(pluginPath: string, options: any): PluginMetadata {
    const size = this.getFileSize(pluginPath);
    const checksum = this.calculateChecksum(pluginPath);

    // 尝试从 FCP 文件中提取 package.json
    let packageData = {};
    try {
      // 这里简化处理，实际应该解压 FCP 文件读取 package.json
      packageData = {
        name: basename(pluginPath, '.fcp'),
        version: '1.0.0',
        description: 'A Fleet Chat plugin',
        author: 'Unknown',
        icon: '🔌'
      };
    } catch (error) {
      // 使用默认值
    }

    return {
      name: packageData.name || basename(pluginPath, '.fcp'),
      version: packageData.version || '1.0.0',
      title: packageData.title || packageData.name || basename(pluginPath, '.fcp'),
      description: packageData.description || 'A Fleet Chat plugin',
      author: packageData.author || 'Unknown',
      category: options.category || 'Productivity',
      tags: options.tags || [],
      icon: packageData.icon || '🔌',
      screenshots: options.screenshots || [],
      homepage: options.homepage || '',
      repository: options.repository || '',
      license: packageData.license || 'MIT',
      size,
      checksum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloads: 0,
      rating: 0,
      reviewCount: 0
    };
  }

  updatePlugin(pluginPath: string, options: any): void {
    const index = this.loadIndex();
    const pluginName = basename(pluginPath, '.fcp');

    const pluginIndex = index.plugins.findIndex(p => p.name === pluginName);
    if (pluginIndex === -1) {
      return this.addPlugin(pluginPath, options);
    }

    // 更新插件元数据
    const metadata = this.extractMetadata(pluginPath, options);
    metadata.createdAt = index.plugins[pluginIndex].createdAt; // 保持创建时间
    metadata.downloads = index.plugins[pluginIndex].downloads; // 保持下载次数

    index.plugins[pluginIndex] = metadata;
    this.saveIndex(index);

    console.log(`✅ Plugin updated in market: ${pluginName}`);
  }

  removePlugin(pluginName: string): void {
    const index = this.loadIndex();
    const initialCount = index.plugins.length;

    index.plugins = index.plugins.filter(p => p.name !== pluginName);

    if (index.plugins.length < initialCount) {
      this.saveIndex(index);
      console.log(`✅ Plugin removed from market: ${pluginName}`);
    } else {
      console.log(`❌ Plugin not found in market: ${pluginName}`);
    }
  }

  searchPlugins(query: string): PluginMetadata[] {
    const index = this.loadIndex();
    const lowerQuery = query.toLowerCase();

    return index.plugins.filter(plugin =>
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.title.toLowerCase().includes(lowerQuery) ||
      plugin.description.toLowerCase().includes(lowerQuery) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  listPlugins(category?: string): PluginMetadata[] {
    const index = this.loadIndex();

    if (category) {
      return index.plugins.filter(p => p.category === category);
    }

    return index.plugins;
  }

  getCategories(): string[] {
    return this.loadIndex().categories.sort();
  }

  getTags(): string[] {
    return this.loadIndex().tags.sort();
  }

  generateStats(): void {
    const index = this.loadIndex();

    console.log('\n📊 Fleet Chat Plugin Market Statistics');
    console.log('=====================================');
    console.log(`Total Plugins: ${index.totalPlugins}`);
    console.log(`Total Downloads: ${index.totalDownloads}`);
    console.log(`Categories: ${index.categories.length}`);
    console.log(`Tags: ${index.tags.length}`);
    console.log(`Last Updated: ${new Date(index.lastUpdated).toLocaleString()}`);

    console.log('\n📈 Top Categories:');
    const categoryCounts: Record<string, number> = {};
    for (const plugin of index.plugins) {
      categoryCounts[plugin.category] = (categoryCounts[plugin.category] || 0) + 1;
    }

    Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} plugins`);
      });
  }

  exportMarket(): string {
    const index = this.loadIndex();
    return JSON.stringify(index, null, 2);
  }
}

// CLI 接口
function showHelp() {
  console.log(`
Fleet Chat Plugin Market CLI

Usage:
  plugin-market <command> [options]

Commands:
  add <plugin.fcp>           Add plugin to market
  update <plugin.fcp>        Update plugin in market
  remove <plugin-name>       Remove plugin from market
  list                       List all plugins
  search <query>             Search plugins
  categories                 List all categories
  tags                       List all tags
  stats                      Show market statistics
  export                     Export market data
  help                       Show this help

Options for add/update:
  --category <name>          Plugin category
  --tags <tag1,tag2>         Comma-separated tags
  --homepage <url>           Plugin homepage
  --repository <url>         Plugin repository
  --screenshots <url1,url2>  Screenshot URLs

Examples:
  plugin-market add my-plugin.fcp --category "Productivity" --tags "utility,tools"
  plugin-market list
  plugin-market search "file manager"
  plugin-market stats
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];
  const market = new PluginMarket();

  try {
    switch (command) {
      case 'add': {
        if (args.length < 2) {
          console.error('❌ Plugin path is required');
          return;
        }

        const options: any = {};
        for (let i = 2; i < args.length; i += 2) {
          const flag = args[i];
          const value = args[i + 1];

          if (!value || !flag.startsWith('--')) {
            continue;
          }

          switch (flag) {
            case '--category':
              options.category = value;
              break;
            case '--tags':
              options.tags = value.split(',');
              break;
            case '--homepage':
              options.homepage = value;
              break;
            case '--repository':
              options.repository = value;
              break;
            case '--screenshots':
              options.screenshots = value.split(',');
              break;
          }
        }

        market.addPlugin(args[1], options);
        break;
      }

      case 'update':
        if (args.length < 2) {
          console.error('❌ Plugin path is required');
          return;
        }
        market.updatePlugin(args[1], {});
        break;

      case 'remove':
        if (args.length < 2) {
          console.error('❌ Plugin name is required');
          return;
        }
        market.removePlugin(args[1]);
        break;

      case 'list': {
        const category = args[2];
        const plugins = market.listPlugins(category);

        if (plugins.length === 0) {
          console.log('No plugins found');
          return;
        }

        console.log(`\n🔌 Fleet Chat Plugins${category ? ` (${category})` : ''}`);
        console.log('================');
        plugins.forEach(plugin => {
          console.log(`📦 ${plugin.title} (${plugin.name}) v${plugin.version}`);
          console.log(`   👤 ${plugin.author} | 📂 ${plugin.category} | ⬇️ ${plugin.downloads} downloads`);
          console.log(`   📝 ${plugin.description}`);
          console.log('');
        });
        break;
      }

      case 'search':
        if (args.length < 2) {
          console.error('❌ Search query is required');
          return;
        }
        const results = market.searchPlugins(args[1]);

        if (results.length === 0) {
          console.log(`No plugins found for "${args[1]}"`);
          return;
        }

        console.log(`\n🔍 Search results for "${args[1]}":`);
        console.log('================');
        results.forEach(plugin => {
          console.log(`📦 ${plugin.title} (${plugin.name})`);
          console.log(`   📝 ${plugin.description}`);
          console.log('');
        });
        break;

      case 'categories':
        console.log('\n📂 Available Categories:');
        console.log('=====================');
        market.getCategories().forEach(category => {
          console.log(`  ${category}`);
        });
        break;

      case 'tags':
        console.log('\n🏷️  Available Tags:');
        console.log('==================');
        market.getTags().forEach(tag => {
          console.log(`  ${tag}`);
        });
        break;

      case 'stats':
        market.generateStats();
        break;

      case 'export':
        const exportData = market.exportMarket();
        console.log('\n📤 Market Export:');
        console.log('================');
        console.log(exportData);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// 插件市场工具就绪