/**
 * Test plugin loading functionality
 */

// 在浏览器控制台中运行此脚本来测试插件加载

console.log('🧪 开始测试插件加载...')

// 1. 检查插件系统是否初始化
function checkPluginSystem() {
  console.log('\n🔍 检查插件系统状态:')
  console.log('  - window.pluginLoader:', !!window.pluginLoader)
  console.log('  - window.pluginManager:', !!window.pluginManager)

  if (window.pluginLoader) {
    console.log('  - loadPluginFromFile:', typeof window.pluginLoader.loadPluginFromFile)
    console.log('  - 可用方法:', Object.getOwnPropertyNames(window.pluginLoader))
  }
}

// 2. 测试手动加载插件
async function testPluginLoading() {
  console.log('\n📦 测试插件加载...')

  try {
    // 读取插件文件
    const response = await fetch('./test-plugin.fcp')
    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'application/zip' })
    const file = new File([blob], 'test-plugin.fcp', { type: 'application/zip' })

    console.log(`📁 创建测试文件: ${file.name} (${file.size} bytes)`)

    if (window.pluginLoader) {
      console.log('🎯 开始加载插件...')
      await window.pluginLoader.loadPluginFromFile(file)
      console.log('✅ 插件加载成功！')
    } else {
      console.log('❌ 插件加载器未初始化')
    }
  } catch (error) {
    console.error('❌ 插件加载失败:', error)
  }
}

// 3. 检查 ZIP 文件结构
async function checkZipStructure() {
  console.log('\n📦 检查 ZIP 文件结构...')

  try {
    const JSZip = require('jszip')
    const fs = require('fs')

    const fileContent = fs.readFileSync('./test-plugin.fcp')
    const zip = await JSZip.loadAsync(fileContent)

    console.log('📋 ZIP 文件内容:')
    Object.keys(zip.files).forEach((filename, index) => {
      const file = zip.files[filename]
      if (!file.dir) {
        console.log(
          `  ${index + 1}. ${filename} (${file.name}) - ${file._data || file._data ? file._data.length : 0} bytes`,
        )
      }
    })

    // 检查 manifest.json
    if (zip.files['manifest.json']) {
      const manifest = await zip.file('manifest.json').async('string')
      const manifestObj = JSON.parse(manifest)
      console.log('\n📋 Manifest 内容:')
      console.log('  - name:', manifestObj.name)
      console.log('  - version:', manifestObj.version)
      console.log('  - commands:', manifestObj.commands?.length || 0)
    }
  } catch (error) {
    console.error('❌ ZIP 检查失败:', error)
  }
}

// 4. 自动运行测试
checkPluginSystem()
testPluginLoading()

// 如果在 Node.js 环境中，也检查 ZIP 结构
if (typeof require !== 'undefined') {
  checkZipStructure()
}

console.log('\n✅ 测试脚本加载完成！')
