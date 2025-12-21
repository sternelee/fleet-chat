const JSZip = require('jszip');
const fs = require('fs');

async function testZipStructure() {
  console.log('🧪 测试 ZIP 文件结构...');

  try {
    const fileContent = fs.readFileSync('./test-plugin.fcp');
    const zip = await JSZip.loadAsync(fileContent);

    console.log('📋 ZIP 文件内容:');
    Object.keys(zip.files).forEach((filename, index) => {
      const file = zip.files[filename];
      if (!file.dir) {
        console.log(`  ${index + 1}. ${filename} - ${file._data ? file._data.length : 0} bytes`);
      }
    });

    // 检查 manifest.json
    if (zip.files['manifest.json']) {
      const manifest = await zip.file('manifest.json').async('string');
      const manifestObj = JSON.parse(manifest);
      console.log('\n📋 Manifest 内容:');
      console.log('  - name:', manifestObj.name);
      console.log('  - version:', manifestObj.version);
      console.log('  - commands:', manifestObj.commands?.length || 0);
    }

    console.log('\n✅ ZIP 文件结构正确！');
  } catch (error) {
    console.error('❌ ZIP 检查失败:', error);
  }
}

testZipStructure();