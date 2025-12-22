#!/usr/bin/env node

/**
 * Fleet Chat Plugin Test Runner
 *
 * 自动化测试插件的功能和兼容性
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { spawn } from 'child_process';
import { Logger, ErrorHandler } from '../../packages/fleet-chat-api/utils/logger.js';

export interface PluginTest {
  name: string;
  description: string;
  test: () => Promise<boolean>;
}

export interface PluginTestResult {
  pluginName: string;
  results: Array<{
    testName: string;
    passed: boolean;
    error?: string;
    duration: number;
  }>;
  totalDuration: number;
  passedTests: number;
  totalTests: number;
  success: boolean;
}

class PluginTestRunner {
  private logger = Logger.getInstance().setContext('PluginTestRunner');
  private pluginsDir: string;

  constructor(pluginsDir: string = 'examples') {
    this.pluginsDir = pluginsDir;
  }

  async runAllTests(): Promise<PluginTestResult[]> {
    const plugins = this.getPluginList();
    const results: PluginTestResult[] = [];

    for (const plugin of plugins) {
      const result = await this.testPlugin(plugin);
      results.push(result);
    }

    this.printSummary(results);
    return results;
  }

  async testPlugin(pluginName: string): Promise<PluginTestResult> {
    const pluginDir = join(this.pluginsDir, pluginName);
    const startTime = performance.now();

    this.logger.info(`Testing plugin: ${pluginName}`);

    const tests: PluginTest[] = [
      {
        name: 'Plugin Structure Test',
        description: '验证插件文件结构',
        test: () => this.testPluginStructure(pluginDir)
      },
      {
        name: 'Package.json Validation',
        description: '验证 package.json 格式',
        test: () => this.testPackageJson(pluginDir)
      },
      {
        name: 'Source Code Validation',
        description: '验证源代码语法',
        test: () => this.testSourceCode(pluginDir)
      },
      {
        name: 'Packaging Test',
        description: '测试插件打包',
        test: () => this.testPackaging(pluginDir)
      },
      {
        name: 'Plugin Size Test',
        description: '验证插件文件大小',
        test: () => this.testPluginSize(pluginName)
      }
    ];

    const results = [];
    let passedTests = 0;

    for (const test of tests) {
      const testStart = performance.now();

      try {
        const passed = await test.test();
        const duration = performance.now() - testStart;

        results.push({
          testName: test.name,
          passed,
          duration
        });

        if (passed) {
          passedTests++;
          this.logger.info(`  ✓ ${test.name} (${duration.toFixed(2)}ms)`);
        } else {
          this.logger.warn(`  ✗ ${test.name} (${duration.toFixed(2)}ms)`);
        }
      } catch (error) {
        const duration = performance.now() - testStart;
        results.push({
          testName: test.name,
          passed: false,
          error: (error as Error).message,
          duration
        });
        this.logger.error(`  ✗ ${test.name}`, error as Error);
      }
    }

    const totalDuration = performance.now() - startTime;
    const success = passedTests === tests.length;

    const result: PluginTestResult = {
      pluginName,
      results,
      totalDuration,
      passedTests,
      totalTests: tests.length,
      success
    };

    this.logger.info(`Plugin ${pluginName} testing completed: ${passedTests}/${tests.length} tests passed`);

    return result;
  }

  private getPluginList(): string[] {
    const plugins: string[] = [];

    // 简化的目录读取实现
    try {
      const testPlugins = ['simple-demo', 'advanced-demo', 'test-plugin', 'template-test'];
      for (const plugin of testPlugins) {
        const pluginPath = join(this.pluginsDir, plugin);
        if (existsSync(pluginPath)) {
          plugins.push(plugin);
        }
      }
    } catch (error) {
      this.logger.error('Failed to get plugin list', error as Error);
    }

    return plugins;
  }

  private async testPluginStructure(pluginDir: string): Promise<boolean> {
    const requiredFiles = ['package.json', 'src/index.ts'];

    for (const file of requiredFiles) {
      const filePath = join(pluginDir, file);
      if (!existsSync(filePath)) {
        this.logger.error(`Required file missing: ${file}`);
        return false;
      }
    }

    return true;
  }

  private async testPackageJson(pluginDir: string): Promise<boolean> {
    try {
      const packageJsonPath = join(pluginDir, 'package.json');
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const requiredFields = ['name', 'version', 'description', 'commands'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          this.logger.error(`Missing required field in package.json: ${field}`);
          return false;
        }
      }

      if (!Array.isArray(packageJson.commands) || packageJson.commands.length === 0) {
        this.logger.error('package.json must have at least one command');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Invalid package.json format', error as Error);
      return false;
    }
  }

  private async testSourceCode(pluginDir: string): Promise<boolean> {
    try {
      const indexPath = join(pluginDir, 'src/index.ts');
      const content = readFileSync(indexPath, 'utf-8');

      // 检查必要的导入
      if (!content.includes('@fleet-chat/raycast-api')) {
        this.logger.error('Source code should import from @fleet-chat/raycast-api');
        return false;
      }

      // 检查是否有默认导出
      if (!content.includes('export default')) {
        this.logger.error('Source code should have a default export');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to validate source code', error as Error);
      return false;
    }
  }

  private async testPackaging(pluginDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      const packerPath = join(process.cwd(), 'tools/simple-packer.ts');
      const child = spawn('node', [packerPath, pluginDir], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.includes('Plugin packed successfully')) {
          resolve(true);
        } else {
          this.logger.error('Packaging failed', new Error(output));
          resolve(false);
        }
      });

      child.on('error', (error) => {
        this.logger.error('Packaging process error', error);
        resolve(false);
      });
    });
  }

  private async testPluginSize(pluginName: string): Promise<boolean> {
    try {
      const fcpPath = join(this.pluginsDir, `${pluginName}.fcp`);
      const pluginFcpPath = join(this.pluginsDir, pluginName, `${pluginName}.fcp`);

      let fcpFile = fcpPath;
      if (!existsSync(fcpFile) && existsSync(pluginFcpPath)) {
        fcpFile = pluginFcpPath;
      }

      if (!existsSync(fcpFile)) {
        this.logger.error('Plugin .fcp file not found');
        return false;
      }

      const stats = statSync(fcpFile);
      const sizeKB = stats.size / 1024;

      if (sizeKB > 100) { // 限制插件大小为 100KB
        this.logger.error(`Plugin too large: ${sizeKB.toFixed(1)} KB (max: 100 KB)`);
        return false;
      }

      this.logger.info(`Plugin size: ${sizeKB.toFixed(1)} KB`);
      return true;
    } catch (error) {
      this.logger.error('Failed to check plugin size', error as Error);
      return false;
    }
  }

  private printSummary(results: PluginTestResult[]): void {
    console.log('\n🧪 Fleet Chat Plugin Test Results\n');
    console.log('=' .repeat(60));

    let totalPlugins = results.length;
    let totalPassed = 0;
    let totalTests = 0;
    let totalPassedTests = 0;

    for (const result of results) {
      totalTests += result.totalTests;
      totalPassedTests += result.passedTests;

      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const passRate = ((result.passedTests / result.totalTests) * 100).toFixed(1);

      console.log(`${status} ${result.pluginName} (${result.passedTests}/${result.totalTests} - ${passRate}%)`);

      if (!result.success) {
        const failedTests = result.results.filter(r => !r.passed);
        for (const test of failedTests) {
          console.log(`    ✗ ${test.testName}: ${test.error || 'Failed'}`);
        }
      }

      if (result.success) {
        totalPassed++;
      }
    }

    console.log('=' .repeat(60));

    const pluginSuccessRate = ((totalPassed / totalPlugins) * 100).toFixed(1);
    const testSuccessRate = ((totalPassedTests / totalTests) * 100).toFixed(1);

    console.log(`📊 Summary:`);
    console.log(`   Plugins: ${totalPassed}/${totalPlugins} (${pluginSuccessRate}%)`);
    console.log(`   Tests: ${totalPassedTests}/${totalTests} (${testSuccessRate}%)`);
    console.log(`   Duration: ${results.reduce((sum, r) => sum + r.totalDuration, 0).toFixed(0)}ms`);

    if (totalPassed === totalPlugins) {
      console.log(`\n🎉 All plugins passed the tests!`);
    } else {
      console.log(`\n⚠️  Some plugins failed. Please review the errors above.`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const pluginsDir = args[0] || 'examples';

  const runner = new PluginTestRunner(pluginsDir);

  try {
    const results = await runner.runAllTests();

    // 返回适当的退出码
    const allPassed = results.every(result => result.success);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    Logger.error('Test runner failed', error as Error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PluginTestRunner, PluginTestResult };