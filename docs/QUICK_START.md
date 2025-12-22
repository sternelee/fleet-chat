# Fleet Chat 插件开发 - 5分钟快速开始

## 🚀 快速开始

想要在 5 分钟内创建你的第一个 Fleet Chat 插件吗？按照以下步骤操作：

### 步骤 1: 创建插件 (30 秒)

```bash
# 方法一：使用 CLI 工具（推荐）
node tools/simple-cli.ts create my-first-plugin

# 方法二：使用模板
node tools/create-from-template.ts my-first-plugin --title "我的第一个插件"
```

### 步骤 2: 查看生成的代码 (15 秒)

插件已创建在 `my-first-plugin/` 目录下，包含：

```
my-first-plugin/
├── package.json    # 插件配置
├── src/
│   └── index.ts    # 插件代码
└── README.md       # 说明文档
```

### 步骤 3: 编辑插件代码 (2 分钟)

打开 `src/index.ts`，你会看到一个示例插件：

```typescript
import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello from my-first-plugin!"
        subtitle="这是你的 Fleet Chat 插件"
        actions={
          <ActionPanel>
            <Action
              title="打招呼"
              onAction={() => {
                showToast({
                  title: "你好！",
                  message: "欢迎使用 Fleet Chat 插件开发"
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

**自定义你的插件**：
- 修改 `title` 和 `subtitle`
- 添加更多的 `List.Item`
- 创建不同的 `Action`

### 步骤 4: 打包插件 (30 秒)

```bash
cd my-first-plugin
node ../tools/simple-packer.ts .
```

成功后会看到：
```
✅ Plugin packed successfully: my-first-plugin.fcp
  Size: 1.2 KB
```

### 步骤 5: 加载到 Fleet Chat (15 秒)

1. 打开 Fleet Chat
2. 将 `my-first-plugin.fcp` 文件拖拽到 Fleet Chat 窗口
3. 插件会自动加载并出现在命令列表中

### 步骤 6: 测试你的插件 (30 秒)

1. 在 Fleet Chat 中搜索 "my-first-plugin"
2. 选择并运行
3. 点击 "打招呼" 按钮
4. 看到弹出的提示消息

🎉 **恭喜！你已经成功创建了第一个 Fleet Chat 插件！**

## 🎯 实用示例

### 示例 1: 链接列表插件

```typescript
import React from 'react';
import { List, ActionPanel, Action, Clipboard, showToast } from '@fleet-chat/raycast-api';

const LINKS = [
  { title: "Fleet Chat GitHub", url: "https://github.com/sternelee/fleet-chat" },
  { title: "React 官网", url: "https://reactjs.org" },
  { title: "Lit 官网", url: "https://lit.dev" }
];

export default function Command() {
  return (
    <List>
      {LINKS.map((link, index) => (
        <List.Item
          key={index}
          title={link.title}
          subtitle={link.url}
          actions={
            <ActionPanel>
              <Action
                title="复制链接"
                onAction={async () => {
                  await Clipboard.copy(link.url);
                  await showToast({ title: "已复制", message: link.url });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### 示例 2: 计算器插件

```typescript
import React, { useState } from 'react';
import { List, ActionPanel, Action, showToast, Clipboard } from '@fleet-chat/raycast-api';

export default function Command() {
  const [result, setResult] = useState<string>("");

  const calculations = [
    { title: "1 + 1", result: "2" },
    { title: "10 × 5", result: "50" },
    { title: "√16", result: "4" },
    { title: "2^8", result: "256" }
  ];

  return (
    <List>
      <List.Item
        title="计算结果"
        subtitle={result || "点击下方计算查看结果"}
      />
      {calculations.map((calc, index) => (
        <List.Item
          key={index}
          title={calc.title}
          subtitle={`结果: ${calc.result}`}
          actions={
            <ActionPanel>
              <Action
                title="显示结果"
                onAction={() => {
                  setResult(`${calc.title} = ${calc.result}`);
                  showToast({ title: "计算完成", message: calc.result });
                }}
              />
              <Action
                title="复制结果"
                onAction={async () => {
                  await Clipboard.copy(calc.result);
                  showToast({ title: "已复制", message: calc.result });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

## 🛠️ 常用功能

### 1. 数据存储

```typescript
import { LocalStorage } from '@fleet-chat/raycast-api';

// 保存数据
await LocalStorage.setItem('user-key', 'user-value');

// 读取数据
const value = await LocalStorage.getItem('user-key');
```

### 2. 系统剪贴板

```typescript
import { Clipboard } from '@fleet-chat/raycast-api';

// 复制文本
await Clipboard.copy('要复制的文本');

// 读取剪贴板
const text = await Clipboard.read();
```

### 3. 显示通知

```typescript
import { showToast } from '@fleet-chat/raycast-api';

await showToast({
  title: "标题",
  message: "消息内容"
});
```

### 4. 多个命令

```typescript
// 在 src/index.ts 中导出多个函数
export default function Command() {
  // 主命令
}

export function secondaryCommand() {
  // 副命令
}

// 在 package.json 中配置
{
  "commands": [
    {
      "name": "default",
      "title": "主命令"
    },
    {
      "name": "secondaryCommand",
      "title": "副命令"
    }
  ]
}
```

## 🔧 调试技巧

1. **使用 console.log**: 在代码中添加 `console.log()` 查看输出
2. **检查打包文件**: 使用 `tar -tzf plugin.fcp` 查看打包内容
3. **验证配置**: 确保 `package.json` 格式正确
4. **测试功能**: 逐步测试每个功能模块

## 📚 获取帮助

- **完整文档**: [PLUGIN_SYSTEM_GUIDE.md](./PLUGIN_SYSTEM_GUIDE.md)
- **API 参考**: [packages/fleet-chat-api/](../packages/fleet-chat-api/)
- **示例插件**: [examples/](../examples/)
- **问题反馈**: 在 GitHub 上提交 Issue

## 🎉 下一步

现在你已经掌握了基础，可以尝试：

- 创建更复杂的 UI
- 添加网络请求
- 处理文件操作
- 开发多命令插件
- 分享你的插件给社区

Happy coding! 🚀