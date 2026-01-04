# Enhanced Fleet Chat Plugin Packaging System

## 概述

重新设计的 CLI 打包工具支持将 Raycast 插件直接转换为 Fleet Chat 插件，使用 React-to-Lit 编译技术。

## 主要特性

### 🔄 React-to-Lit 转换
- 自动将 React 组件转换为 Lit Web Components
- 保留 Raycast API 兼容性
- 支持 TypeScript 和 JSX
- 转换 React Hooks 到 Lit 生命周期方法

### 📦 智能打包
- 解析 package.json 并生成 Fleet Chat 兼容的 manifest
- 自动转换依赖导入
- 压缩资源文件
- 生成校验和确保文件完整性

### 🛠️ 多种工具支持
- `enhanced-plugin-packer.ts` - 高级转换器（使用 @lit/react）
- `react-to-lit-converter.ts` - 专用转换器
- `native-packager.cjs` - 简化版本（使用原生 Node.js 模块）

## 工具架构

### 1. Enhanced Plugin Packer
```bash
# 打包 Raycast 插件
npx ts-node tools/enhanced-plugin-packer.ts package <plugin-path> <output-file>

# 转换单个文件
npx ts-node tools/enhanced-plugin-packer.ts convert <input-file> <output-file>
```

### 2. React-to-Lit Converter
```typescript
import { RaycastToLitConverter } from './react-to-lit-converter.js';

const converter = new RaycastToLitConverter();
const converted = await converter.convertComponent(filePath, options);
```

### 3. Native Packager (推荐)
```bash
# 使用原生 Node.js 模块的简单打包工具
node tools/native-packager.cjs <plugin-path> <output-file>
```

## 转换过程

### 1. 导入更新
```typescript
// 原始 Raycast
import { List, ActionPanel } from "@raycast/api";

// 转换后的 Fleet Chat
import { List, ActionPanel } from '@fleet-chat/core-api';
```

### 2. 组件转换
```typescript
// React 组件
export default function TodoList() {
  return (
    <List>
      <List.Item title="Hello" />
    </List>
  );
}

// Lit 组件
@customElement('todolist')
class TodoList extends LitElement {
  static styles = css`...`;

  render() {
    return html`
      <fleet-list>
        <fleet-list-item title="Hello"></fleet-list-item>
      </fleet-list>
    `;
  }
}
```

### 3. Hooks 转换
```typescript
// React Hooks
const [todos, setTodos] = useState([]);
useEffect(() => {
  // 副作用
}, [todos]);

// Lit 属性和生命周期
@property() todos: any[] = [];

firstUpdated() {
  // 副作用
}
```

## Raycast API 兼容层

### 组件映射
| Raycast | Fleet Chat |
|---------|------------|
| `List` | `fleet-list` |
| `List.Item` | `fleet-list-item` |
| `ActionPanel` | `fleet-action-panel` |
| `ActionPanel.Item` | `fleet-action` |
| `Detail` | `fleet-detail` |
| `Form` | `fleet-form` |

### 系统API映射
```typescript
// Toast 通知
showToast({ title: "Hello", message: "World" });

// 剪贴板
await Clipboard.readText();
await Clipboard.writeText("Hello");

// 存储
await LocalStorage.set("key", "value");
const value = await LocalStorage.get("key");

// 文件系统
await FileSystem.exists("/path/to/file");
const content = await FileSystem.readFile("/path/to/file");
```

## 使用示例

### 1. 打包真实的 Raycast 插件
```bash
# 使用 Todo List 插件测试
node tools/native-packager.cjs /Users/sternelee/www/github/raycast-extension-todo-list ./todo-list-enhanced.fcp
```

输出：
```
🚀 Starting to pack plugin: /Users/sternelee/www/github/raycast-extension-todo-list
🔄 Converting clear_completed.tsx...
🔄 Converting delete_all.tsx...
🔄 Converting index.tsx...
...
✅ Plugin packed successfully: ./todo-list-enhanced.fcp
📋 Package size: 185.81 KB
```

### 2. 转换单个组件
```bash
# 转换测试
node tools/test-conversion.cjs
```

## 插件包结构

```
todo-list-enhanced.fcp (gzip compressed)
├── manifest.json           # Fleet Chat 插件清单
├── metadata.json           # 构建元数据和校验和
├── src/                    # 转换后的源代码
│   ├── index.ts           # 主组件（已转换）
│   ├── todo_item.ts       # 组件（已转换）
│   └── ...
└── assets/                 # 静态资源
    └── icon.png
```

## 配置选项

### ConversionOptions
```typescript
interface ConversionOptions {
  preserveImports?: boolean;    // 保留原始导入
  addTypeAnnotations?: boolean; // 添加类型注解
  includeStyles?: boolean;      // 包含样式
}
```

## 测试和验证

### 1. 单元测试
- 测试 React 组件转换
- 验证 API 兼容性
- 检查生成的文件结构

### 2. 集成测试
- 使用真实 Raycast 插件测试
- 验证拖拽安装功能
- 测试插件加载和执行

### 3. 性能测试
- 转换速度基准测试
- 包大小分析
- 内存使用监控

## 故障排除

### 常见问题

1. **转换失败**
   - 检查 TypeScript 语法
   - 确认所有依赖已安装
   - 查看错误日志

2. **API 不兼容**
   - 使用 Raycast API 兼容层
   - 检查组件映射表
   - 更新 API 适配器

3. **包格式错误**
   - 验证 manifest.json 格式
   - 检查文件路径
   - 确认压缩格式

### 调试技巧

```bash
# 详细日志
node tools/native-packager.cjs /path/to/plugin --verbose

# 检查生成的文件
file todo-list-enhanced.fcp
hexdump -C todo-list-enhanced.fcp | head
```

## 开发指南

### 添加新的转换规则
```typescript
// 在 react-to-lit-converter.ts 中添加
private convertCustomPattern(content: string): string {
  return content.replace(/pattern/g, 'replacement');
}
```

### 扩展 API 兼容层
```typescript
// 在 raycast-compat/react-components.ts 中添加
export const NewComponent = React.forwardRef((props, ref) => {
  return React.createElement('fleet-new-component', { ...props, ref });
});
```

## 未来改进

1. **高级转换**
   - 支持 React 19 的新特性
   - 更复杂的 Hook 转换
   - 动态导入处理

2. **性能优化**
   - 并行转换处理
   - 增量更新
   - 缓存机制

3. **开发工具**
   - VS Code 扩展
   - 实时预览
   - 调试支持

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 编写测试
4. 提交 Pull Request
5. 等待审核

## 许可证

MIT License - 详见 LICENSE 文件