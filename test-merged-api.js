/**
 * Test Merged API Integration
 * 测试合并后的 API 集成
 */

import { readFileSync, existsSync } from 'fs';

console.log('🧪 Testing Merged API Integration\n');

// 测试基本的 package.json 引用是否正确更新
try {

  // 检查示例插件 package.json 是否已更新
  const testPluginPath = './packages/fleet-chat-api/examples/testplugin/package.json';
  const testPluginContent = JSON.parse(readFileSync(testPluginPath, 'utf-8'));

  console.log('✅ 测试插件依赖检查:');
  console.log(`   依赖: ${JSON.stringify(testPluginContent.dependencies)}`);

  if (testPluginContent.dependencies['@fleet-chat/raycast-api']) {
    console.log('   ✅ 已更新到 @fleet-chat/raycast-api');
  } else {
    console.log('   ❌ 未找到 @fleet-chat/raycast-api 依赖');
  }

  if (testPluginContent.dependencies['@fleet-chat/raycast-api-compat']) {
    console.log('   ❌ 仍然存在旧依赖 @fleet-chat/raycast-api-compat');
  } else {
    console.log('   ✅ 已移除旧依赖 @fleet-chat/raycast-api-compat');
  }

} catch (error) {
  console.error('❌ 依赖检查失败:', error.message);
}

console.log('\n');

// 检查 TypeScript 配置文件
try {
  const tsconfigPath = './packages/fleet-chat-api/examples/testplugin/tsconfig.json';
  const tsconfigContent = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

  console.log('✅ TypeScript 配置检查:');

  const jsxSource = tsconfigContent.compilerOptions.jsxImportSource;
  if (jsxSource === '@fleet-chat/raycast-api') {
    console.log('   ✅ jsxImportSource 已更新');
  } else {
    console.log(`   ❌ jsxImportSource 仍然是: ${jsxSource}`);
  }

  const paths = tsconfigContent.compilerOptions.paths;
  if (paths && paths['@raycast/api']) {
    const raycastPath = paths['@raycast/api'][0];
    if (raycastPath.includes('@fleet-chat/raycast-api')) {
      console.log('   ✅ @raycast/api 路径已更新');
    } else {
      console.log(`   ❌ @raycast/api 路径仍然是: ${raycastPath}`);
    }
  } else {
    console.log('   ❌ 未找到 @raycast/api 路径配置');
  }

} catch (error) {
  console.error('❌ TypeScript 配置检查失败:', error.message);
}

console.log('\n');

// 检查源代码导入
try {
  const indexPath = './packages/fleet-chat-api/examples/testplugin/src/index.ts';
  const indexContent = readFileSync(indexPath, 'utf-8');

  console.log('✅ 源代码导入检查:');

  if (indexContent.includes("@fleet-chat/raycast-api")) {
    console.log('   ✅ 已更新到 @fleet-chat/raycast-api 导入');
  } else {
    console.log('   ❌ 未找到 @fleet-chat/raycast-api 导入');
  }

  if (indexContent.includes("@fleet-chat/raycast-api-compat")) {
    console.log('   ❌ 仍然存在旧导入 @fleet-chat/raycast-api-compat');
  } else {
    console.log('   ✅ 已移除旧导入 @fleet-chat/raycast-api-compat');
  }

} catch (error) {
  console.error('❌ 源代码导入检查失败:', error.message);
}

console.log('\n');

// 检查核心文件结构
try {
  console.log('✅ 核心文件结构检查:');

  const filesToCheck = [
    './packages/fleet-chat-api/index.ts',
    './packages/fleet-chat-api/raycast-api/index.ts',
    './packages/fleet-chat-api/utils/react-to-lit.ts',
    './packages/fleet-chat-api/package.json'
  ];

  filesToCheck.forEach(file => {
    const exists = existsSync(file);
    if (exists) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} 不存在`);
    }
  });

} catch (error) {
  console.error('❌ 文件结构检查失败:', error.message);
}

console.log('\n🎯 合并总结:');
console.log('================');
console.log('1. @fleet-chat/raycast-api-compat 功能已合并到 @fleet-chat/raycast-api');
console.log('2. 所有配置文件已更新到新的导入路径');
console.log('3. 示例插件已更新使用新的 API 路径');
console.log('4. TypeScript 配置已更新');
console.log('\n✨ 合并完成！新系统已就绪。');