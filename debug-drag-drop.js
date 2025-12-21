/**
 * Debug script for drag-drop functionality
 */

// 在浏览器控制台中运行这个脚本来测试拖拽功能

console.log('🔍 开始调试拖拽功能...');

// 1. 检查全局组件是否存在
const globalDropHandler = document.querySelector('global-drop-handler');
console.log('📦 Global Drop Handler 元素:', globalDropHandler ? '✅ 存在' : '❌ 不存在');

// 2. 检查插件系统是否初始化
console.log('🔌 插件系统状态:');
console.log('  - window.pluginManager:', !!window.pluginManager);
console.log('  - window.pluginLoader:', !!window.pluginLoader);

// 3. 测试手动触发拖拽事件
function testDragDrop() {
  console.log('🧪 测试拖拽事件...');

  // 创建测试文件
  const testFile = new File(['test content'], 'test.fcp', { type: 'application/octet-stream' });

  // 创建拖拽事件
  const dragEnterEvent = new DragEvent('dragenter', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new DataTransfer()
  });
  dragEnterEvent.dataTransfer.items.add(testFile);

  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new DataTransfer()
  });
  dropEvent.dataTransfer.files.add(testFile);

  // 触发事件
  document.dispatchEvent(dragEnterEvent);

  setTimeout(() => {
    document.dispatchEvent(dropEvent);
    console.log('📤 测试拖拽事件已触发');
  }, 100);
}

// 4. 检查拖拽监听器
function checkDragListeners() {
  const listeners = [];

  // 检查 document 上的拖拽监听器
  if (document.onmousedown) listeners.push('mousedown');
  if (document.ondragenter) listeners.push('dragenter');
  if (document.ondragover) listeners.push('dragover');
  if (document.ondrop) listeners.push('drop');

  console.log('🎧 检测到的拖拽监听器:', listeners.length);
  console.log('  - 监听器类型:', listeners);

  // 使用 EventTarget 检查监听器（需要浏览器支持）
  if (window.getEventListeners) {
    const docListeners = window.getEventListeners(document);
    console.log('  - 详细监听器:', docListeners);
  }
}

// 5. 检查插件加载器
function checkPluginLoader() {
  if (window.pluginLoader) {
    console.log('📦 插件加载器方法:', Object.getOwnPropertyNames(window.pluginLoader));
    console.log('  - loadPluginFromFile:', typeof window.pluginLoader.loadPluginFromFile);
  }
}

// 6. 创建调试UI
function createDebugUI() {
  const debugPanel = document.createElement('div');
  debugPanel.id = 'drag-drop-debug';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
  `;

  debugPanel.innerHTML = `
    <h4>🔍 拖拽调试面板</h4>
    <button onclick="window.testDragDrop()">测试拖拽</button><br>
    <button onclick="window.checkDragListeners()">检查监听器</button><br>
    <button onclick="window.checkPluginLoader()">检查加载器</button><br>
    <button onclick="this.parentElement.remove()">关闭</button>
    <div id="debug-output" style="margin-top: 10px; white-space: pre-wrap;"></div>
  `;

  document.body.appendChild(debugPanel);

  // 添加全局函数
  window.testDragDrop = testDragDrop;
  window.checkDragListeners = checkDragListeners;
  window.checkPluginLoader = checkPluginLoader;

  // 重定向console.log到调试面板
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    const output = document.getElementById('debug-output');
    if (output) {
      output.textContent += args.join(' ') + '\n';
    }
  };
}

// 7. 自动运行检查
console.log('\n🔧 运行检查...');
checkDragListeners();
checkPluginLoader();

// 8. 创建调试UI
createDebugUI();

console.log('\n✅ 调试脚本加载完成！');
console.log('💡 提示: 使用右上角的调试面板来测试功能');