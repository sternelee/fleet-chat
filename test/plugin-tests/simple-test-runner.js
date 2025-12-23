#!/usr/bin/env node

/**
 * Simple Fleet Chat Plugin Test Runner
 * 简化的插件测试运行器
 */

import { existsSync, readFileSync, statSync } from 'fs'
import { join, basename } from 'path'
import { spawn } from 'child_process'

class SimpleTestRunner {
  constructor(pluginsDir = 'examples') {
    this.pluginsDir = pluginsDir
  }

  async runAllTests() {
    console.log('🧪 Fleet Chat Plugin Test Suite')
    console.log('=================================')

    const plugins = this.getPluginList()
    let totalPassed = 0
    let totalTests = 0

    for (const plugin of plugins) {
      const passed = await this.testPlugin(plugin)
      totalTests++
      if (passed) totalPassed++
    }

    console.log('\n📊 Summary:')
    console.log(
      `   Plugins: ${totalPassed}/${totalTests} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`,
    )

    if (totalPassed === totalTests) {
      console.log('\n🎉 All plugins passed the tests!')
    } else {
      console.log('\n⚠️  Some plugins failed.')
    }

    return totalPassed === totalTests
  }

  getPluginList() {
    const plugins = ['simple-demo', 'advanced-demo', 'test-plugin', 'template-test']
    return plugins.filter((plugin) => {
      const pluginPath = join(this.pluginsDir, plugin)
      return existsSync(pluginPath)
    })
  }

  async testPlugin(pluginName) {
    console.log(`\n🔍 Testing: ${pluginName}`)

    const tests = [
      { name: 'Structure', test: () => this.testStructure(pluginName) },
      { name: 'Package.json', test: () => this.testPackageJson(pluginName) },
      { name: 'Source Code', test: () => this.testSourceCode(pluginName) },
      { name: 'Packaging', test: () => this.testPackaging(pluginName) },
    ]

    let passedTests = 0

    for (const { name, test } of tests) {
      try {
        const passed = await test()
        if (passed) {
          console.log(`  ✅ ${name}`)
          passedTests++
        } else {
          console.log(`  ❌ ${name}`)
        }
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`)
      }
    }

    const success = passedTests === tests.length
    const status = success ? '✅' : '❌'
    console.log(`${status} ${pluginName}: ${passedTests}/${tests.length} tests passed`)

    return success
  }

  async testStructure(pluginName) {
    const pluginDir = join(this.pluginsDir, pluginName)
    const requiredFiles = ['package.json', 'src/index.ts']

    for (const file of requiredFiles) {
      if (!existsSync(join(pluginDir, file))) {
        return false
      }
    }

    return true
  }

  async testPackageJson(pluginName) {
    try {
      const packageJsonPath = join(this.pluginsDir, pluginName, 'package.json')
      const content = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(content)

      const requiredFields = ['name', 'version', 'commands']
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          return false
        }
      }

      return true
    } catch {
      return false
    }
  }

  async testSourceCode(pluginName) {
    try {
      const indexPath = join(this.pluginsDir, pluginName, 'src/index.ts')
      const content = readFileSync(indexPath, 'utf-8')

      // 检查必要的导入
      if (!content.includes('@fleet-chat/raycast-api')) {
        return false
      }

      // 检查是否有默认导出
      if (!content.includes('export default')) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  async testPackaging(pluginName) {
    return new Promise((resolve) => {
      const pluginDir = join(this.pluginsDir, pluginName)
      const packerPath = join(process.cwd(), 'tools/simple-packer.ts')

      console.log(`    📦 Testing packaging for ${pluginDir}...`)

      const child = spawn('node', [packerPath, pluginDir], {
        stdio: 'pipe',
        cwd: process.cwd(),
      })

      let output = ''
      child.stdout.on('data', (data) => {
        output += data.toString()
      })

      child.stderr.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        resolve(code === 0 && output.includes('Plugin packed successfully'))
      })

      child.on('error', () => {
        resolve(false)
      })
    })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const pluginsDir = args[0] || 'examples'

  const runner = new SimpleTestRunner(pluginsDir)
  const allPassed = await runner.runAllTests()

  process.exit(allPassed ? 0 : 1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
