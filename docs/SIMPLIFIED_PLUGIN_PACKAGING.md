# Fleet Chat 简化插件打包系统

## 🎯 设计理念

**核心理念**: 使用 `@lit/react` 直接支持 React 组件，通过兼容包实现对 Raycast API 的无缝支持。

## 🏗️ 架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Raycast Plugin    │    │   @lit/react    │    │  Fleet Chat API   │
│   (React Syntax)   │───▶│   Wrapper       │──▶│  (Lit Components) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 兼容包设计

### 1. @fleet-chat/raycast-api

```typescript
// packages/fleet-chat-api/raycast-api/index.ts
export * from '@raycast/api';

// 重写特定组件以适配 @lit/react
import { createLitComponent } from '../utils/react-to-lit';
import { List, ActionPanel, Action, Detail, Grid } from '../components';

export const ReactList = createLitComponent(List);
export const ReactActionPanel = createLitComponent(ActionPanel);
export const ReactAction = createLitComponent(Action);
// ... 其他组件
```

### 2. React-to-Lit 适配器

```typescript
// packages/fleet-chat-api/utils/react-to-lit.ts
import { createComponent } from '@lit/react';
import { html, TemplateResult } from 'lit';

export function createLitComponent(LitComponent: any) {
  return React.forwardRef((props: any, ref: any) => {
    return createComponent({
      render: () => html`<${LitComponent} ${props}></${LitComponent}>`,
      ref
    });
  });
}
```

## 🛠️ 简化的打包流程

### 1. 无需转换的直接支持

```typescript
// plugins/todolist/src/index.ts
import { List, ActionPanel, Action } from '@fleet-chat/raycast-api';

export default function TodoList() {
  return (
    <List>
      <List.Item
        title="Hello World"
        actions={
          <ActionPanel>
            <Action title="Say Hello" onAction={() => console.log("Hello")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### 2. 简单的打包工具

```typescript
// tools/simple-packer.ts
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { join } from 'path';
import { archive } from 'tar';

export async function packPlugin(pluginDir: string, outputFile: string) {
  const manifest = JSON.parse(
    await fs.readFile(join(pluginDir, 'package.json'), 'utf-8')
  );

  // 创建插件包
  const tarStream = createWriteStream(outputFile);
  const pack = tar.create(
    { gzip: true },
    [
      {
        name: 'plugin.json',
        contents: JSON.stringify({
          name: manifest.name,
          version: manifest.version,
          title: manifest.description,
          author: manifest.author,
          commands: manifest.commands,
          icon: manifest.icon || '📦',
        }),
      },
      {
        name: 'src/',
        directory: true,
        entries: await readdir(join(pluginDir, 'src')),
      },
    ]
  );

  pack.pipe(tarStream);
}
```

## 📦 插件包结构

```
my-plugin.fcp (gzip compressed)
├── plugin.json          # 简化的插件清单
├── src/
│   ├── index.ts         # 主插件代码（React语法）
│   ├── components/       # 组件文件
│   └── utils/           # 工具函数
└── assets/               # 静态资源
    └── icon.png
```

## 🔧 实施步骤

### 阶段 1: 创建兼容包

```bash
# 创建 @fleet-chat/raycast-api 包
mkdir -p packages/fleet-chat-api/raycast-api
```

### 阶段 2: 实现核心适配器

```bash
# 实现 React-to-Lit 适配器
# 重新导出所有 Raycast 组件
# 添加必要的类型定义
```

### 阶段 3: 简化打包工具

```bash
# 创建简单的打包 CLI
# 移除复杂的转换逻辑
# 专注于打包和分发
```

## 📊 对比分析

| 方面 | 当前复杂方案 | 简化新方案 |
|------|-------------|-----------|
| **打包复杂度** | 高（多工具链） | 低（单一工具） |
| **维护成本** | 高 | 低 |
| **开发体验** | 一般 | 优秀 |
| **性能** | 中等 | 优秀 |
| **稳定性** | 一般 | 优秀 |
| **学习成本** | 高 | 低 |

## 🎯 具体实施

让我开始实施这个简化的方案：

1. **创建 @fleet-chat/raycast-api 兼容包**
2. **实现 React-to-Lit 适配器**
3. **简化打包工具**
4. **更新插件系统文档**

这样我们就能获得：
- ✅ 直接的 React 支持
- ✅ 无需复杂的转换过程
- ✅ 更好的性能和稳定性
- ✅ 更低的维护成本

你觉得这个简化方案怎么样？我们可以立即开始实施。