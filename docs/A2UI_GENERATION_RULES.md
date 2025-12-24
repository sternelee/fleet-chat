# A2UI Plugin Generation Rules Based on Fleet Chat API

## 概述

本文档定义了基于 `@fleet-chat/api` 插件系统的 A2UI 生成规则。这些规则确保生成的插件完全兼容 Fleet Chat 的 API 和组件系统。

## 核心原则

1. **100% Fleet Chat API 兼容**：使用 `@fleet-chat/api` 而不是 `@raycast/api`
2. **Lit 组件架构**：生成的组件基于 Lit web components
3. **Tauri 增强功能**：利用 Tauri 的原生系统能力
4. **TypeScript 优先**：所有代码使用 TypeScript 编写
5. **响应式状态管理**：使用 Fleet Chat 的状态管理系统

## 导入规则

### 正确的导入方式

```typescript
// ✅ 正确 - 使用 Fleet Chat API
import {
  List,
  Grid,
  Detail,
  Form,
  Action,
  ActionPanel,
  showToast,
  showHUD,
  LocalStorage,
  Cache,
  Clipboard,
  useNavigation,
  push,
  pop
} from '@fleet-chat/api';
```

### 错误的导入方式

```typescript
// ❌ 错误 - 不要使用 Raycast API
import { List, Action } from '@raycast/api';

// ❌ 错误 - 不要使用 fleet-chat-raycast-api
import { List } from '@fleet-chat/raycast-api';
```

## 组件生成规则

### 1. List 组件

#### 基础结构
```typescript
import { List, ActionPanel, Action, showToast } from '@fleet-chat/api';
import { useState, useEffect } from 'lit/decorators.js';

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 数据加载
  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setIsLoading(true);
    try {
      // 加载数据逻辑
      const data = await fetchData();
      setItems(data);
    } catch (error) {
      await showToast({
        title: 'Error',
        message: String(error),
        style: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 过滤逻辑
  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Plugin Name"
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          accessories={[
            { text: item.accessoryText }
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Primary Action"
                onAction={async () => {
                  // 操作逻辑
                }}
              />
              <Action
                title="Secondary Action"
                onAction={async () => {
                  // 操作逻辑
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

#### List.Item 属性

- `key` (必需): 唯一标识符
- `title` (必需): 主标题
- `subtitle`: 副标题
- `icon`: 图标 (字符串或 IconProps)
- `accessories`: 附件数组
  - `text`: 文本
  - `icon`: 图标
  - `tag`: 标签 `{ value, color }`
  - `date`: 日期
- `actions`: ActionPanel 组件
- `keywords`: 搜索关键词

### 2. Grid 组件

```typescript
import { Grid, ActionPanel, Action } from '@fleet-chat/api';

export default function Command() {
  const [items, setItems] = useState<GridItem[]>([]);

  return (
    <Grid
      columns={3}
      fit={Grid.Fit.Fill}
      aspectRatio="16/9"
    >
      {items.map((item) => (
        <Grid.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          content={{ source: item.imageUrl }}
          actions={
            <ActionPanel>
              <Action
                title="View"
                onAction={() => {
                  // 操作逻辑
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
```

### 3. Detail 组件

```typescript
import { Detail, ActionPanel, Action } from '@fleet-chat/api';

export default function Command() {
  const [content, setContent] = useState('');

  const markdown = `
# Title

Content goes here with **markdown** support.

## Features
- Feature 1
- Feature 2
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Created"
            text="2024-01-01"
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Website"
            target="https://example.com"
            text="Visit"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy"
            onAction={async () => {
              await Clipboard.copy(markdown);
              await showToast({
                title: 'Copied',
                message: 'Content copied to clipboard'
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
```

### 4. Form 组件

```typescript
import { Form, ActionPanel, Action, showToast } from '@fleet-chat/api';

interface FormValues {
  name: string;
  email: string;
  message: string;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    try {
      // 处理表单提交
      await processForm(values);
      await showToast({
        title: 'Success',
        message: 'Form submitted successfully',
        style: 'success'
      });
    } catch (error) {
      await showToast({
        title: 'Error',
        message: String(error),
        style: 'error'
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter your name"
        required
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your email"
        required
      />
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter your message"
      />
      <Form.Dropdown
        id="category"
        title="Category"
        defaultValue="general"
      >
        <Form.Dropdown.Item value="general" title="General" />
        <Form.Dropdown.Item value="support" title="Support" />
        <Form.Dropdown.Item value="feedback" title="Feedback" />
      </Form.Dropdown>
      <Form.Checkbox
        id="subscribe"
        label="Subscribe to newsletter"
        defaultValue={false}
      />
    </Form>
  );
}
```

## Action 系统

### ActionPanel

```typescript
<ActionPanel>
  <Action
    title="Primary Action"
    icon="✓"
    shortcut={{ modifiers: ['cmd'], key: 'enter' }}
    onAction={async () => {
      // 操作逻辑
    }}
  />
  <Action
    title="Secondary Action"
    icon="🔗"
    onAction={() => {
      // 操作逻辑
    }}
  />
  <Action.OpenInBrowser
    title="Open in Browser"
    url="https://example.com"
  />
  <Action.CopyToClipboard
    title="Copy URL"
    content="https://example.com"
  />
</ActionPanel>
```

### 内置 Action 类型

1. **Action** - 基础操作
2. **Action.OpenInBrowser** - 在浏览器中打开
3. **Action.CopyToClipboard** - 复制到剪贴板
4. **Action.ShowInFinder** - 在 Finder 中显示
5. **Action.SubmitForm** - 提交表单

## 状态管理

### LocalStorage

```typescript
import { LocalStorage } from '@fleet-chat/api';

// 保存数据
await LocalStorage.setItem('key', JSON.stringify(data));

// 读取数据
const stored = await LocalStorage.getItem('key');
if (stored) {
  const data = JSON.parse(stored);
}

// 删除数据
await LocalStorage.removeItem('key');

// 清空所有数据
await LocalStorage.clear();

// 获取所有键
const keys = await LocalStorage.allKeys();
```

### Cache

```typescript
import { Cache } from '@fleet-chat/api';

const cache = new Cache();

// 设置缓存 (带 TTL)
await cache.set('key', data, { ttl: 3600 }); // 1小时

// 获取缓存
const cached = await cache.get('key');

// 删除缓存
await cache.remove('key');

// 清空缓存
await cache.clear();
```

## 导航系统

### 使用导航 Hooks

```typescript
import { useNavigation, push, pop } from '@fleet-chat/api';

export default function Command() {
  const { push, pop } = useNavigation();

  return (
    <List>
      <List.Item
        title="Open Detail"
        actions={
          <ActionPanel>
            <Action
              title="View Details"
              onAction={() => {
                push(<DetailView />);
              }}
            />
            <Action
              title="Go Back"
              onAction={() => {
                pop();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

### 导航 API

- `push(component, options?)` - 推入新视图
- `pop()` - 返回上一视图
- `popToRoot()` - 返回根视图
- `replace(component, options?)` - 替换当前视图
- `clear()` - 清空导航栈

## Toast 通知

```typescript
import { showToast, Toast } from '@fleet-chat/api';

// 成功通知
await showToast({
  title: 'Success',
  message: 'Operation completed',
  style: 'success'
});

// 错误通知
await showToast({
  title: 'Error',
  message: 'Something went wrong',
  style: 'error'
});

// 警告通知
await showToast({
  title: 'Warning',
  message: 'Please check your input',
  style: 'warning'
});

// 信息通知
await showToast({
  title: 'Info',
  message: 'New update available',
  style: 'info',
  duration: 5000 // 5秒后自动关闭
});
```

## 系统集成

### Clipboard

```typescript
import { Clipboard } from '@fleet-chat/api';

// 复制文本
await Clipboard.copy('Hello World');

// 读取剪贴板
const text = await Clipboard.readText();

// 复制对象 (自动序列化)
await Clipboard.copy(JSON.stringify({ data: 'value' }));
```

### 应用程序管理

```typescript
import { getApplications, openApplication } from '@fleet-chat/api';

// 获取所有应用
const apps = await getApplications();

// 打开应用
await openApplication('/Applications/Safari.app');
```

## Plugin Manifest 结构

```json
{
  "$schema": "https://fleet-chat.dev/schema.json",
  "name": "plugin-name",
  "title": "Plugin Title",
  "description": "Plugin description",
  "icon": "🔌",
  "author": "Your Name",
  "license": "MIT",
  "version": "1.0.0",
  "categories": ["Productivity", "Developer Tools"],
  "commands": [
    {
      "name": "default",
      "title": "Main Command",
      "description": "Main command description",
      "mode": "view",
      "icon": "📋",
      "shortcut": {
        "modifiers": ["cmd", "shift"],
        "key": "p"
      }
    }
  ],
  "preferences": [
    {
      "name": "apiKey",
      "type": "password",
      "required": true,
      "title": "API Key",
      "description": "Your API key"
    }
  ],
  "dependencies": {
    "@fleet-chat/api": "^1.0.0"
  }
}
```

## 错误处理模式

```typescript
export default function Command() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await loadData();
      } catch (err) {
        setError(err as Error);
        await showToast({
          title: 'Error',
          message: (err as Error).message,
          style: 'error'
        });
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={() => {
                setError(null);
                loadData();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // 正常渲染
}
```

## 加载状态模式

```typescript
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const result = await fetchData();
        setData(result);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  return (
    <List isLoading={isLoading}>
      {data.map(item => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

## TypeScript 类型定义

```typescript
// 数据类型
interface Item {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// Props 类型
interface CommandProps {
  arguments?: Record<string, any>;
  launchContext?: any;
}

// Hook 返回类型
interface UseDataResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

## 生成规则总结

### 必须包含的元素

1. **导入声明**
   - 使用 `@fleet-chat/api`
   - 导入所需的组件和 API

2. **类型定义**
   - 定义数据接口
   - 使用 TypeScript 类型注解

3. **状态管理**
   - 使用 `useState` 管理组件状态
   - 使用 `useEffect` 处理副作用

4. **错误处理**
   - Try-catch 块
   - Toast 错误提示
   - 错误状态显示

5. **加载状态**
   - `isLoading` 状态
   - Loading 指示器

6. **Actions**
   - 至少一个主要操作
   - 适当的键盘快捷键

7. **数据持久化** (如果需要)
   - LocalStorage 或 Cache
   - 适当的序列化/反序列化

### 代码质量要求

1. **类型安全**: 完整的 TypeScript 类型
2. **错误处理**: 所有异步操作都有错误处理
3. **用户反馈**: 操作后的 Toast 通知
4. **响应式**: 搜索和过滤功能
5. **性能**: 避免不必要的重渲染
6. **可访问性**: 适当的语义化标签

## 示例：完整的插件

```typescript
import {
  List,
  ActionPanel,
  Action,
  showToast,
  LocalStorage,
  Clipboard,
  useNavigation
} from '@fleet-chat/api';
import { useState, useEffect } from 'lit/decorators.js';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    try {
      const stored = await LocalStorage.getItem('todos');
      if (stored) {
        setTodos(JSON.parse(stored));
      }
    } catch (error) {
      await showToast({
        title: 'Error loading todos',
        message: String(error),
        style: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTodos(newTodos: Todo[]) {
    await LocalStorage.setItem('todos', JSON.stringify(newTodos));
    setTodos(newTodos);
  }

  async function toggleTodo(id: string) {
    const updated = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    await saveTodos(updated);
    await showToast({
      title: 'Todo updated',
      style: 'success'
    });
  }

  async function deleteTodo(id: string) {
    const updated = todos.filter(todo => todo.id !== id);
    await saveTodos(updated);
    await showToast({
      title: 'Todo deleted',
      style: 'success'
    });
  }

  const filteredTodos = todos.filter(todo =>
    todo.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Todo List"
    >
      {filteredTodos.map((todo) => (
        <List.Item
          key={todo.id}
          title={todo.title}
          icon={todo.completed ? '✅' : '⭕'}
          accessories={[
            {
              text: new Date(todo.createdAt).toLocaleDateString()
            }
          ]}
          actions={
            <ActionPanel>
              <Action
                title={todo.completed ? 'Mark Incomplete' : 'Mark Complete'}
                onAction={() => toggleTodo(todo.id)}
              />
              <Action
                title="Copy Title"
                onAction={async () => {
                  await Clipboard.copy(todo.title);
                  await showToast({
                    title: 'Copied',
                    message: 'Todo title copied to clipboard'
                  });
                }}
              />
              <Action
                title="Delete"
                style="destructive"
                onAction={() => deleteTodo(todo.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

## 参考资源

- [Fleet Chat API 文档](../packages/fleet-chat-api/README.md)
- [插件系统指南](./PLUGIN_SYSTEM_GUIDE.md)
- [组件示例](../packages/fleet-chat-api/examples/)
- [TypeScript 类型定义](../packages/fleet-chat-api/types/)
