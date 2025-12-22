/**
 * testplugin Plugin for Fleet Chat
 */

import { showToast } from '@fleet-chat/raycast-api';

export default async function() {
  console.log('testplugin plugin initialized');
}

/**
 * Hello World
 */
export async function hello() {
  const markdownContent = `# Hello from testplugin! 👋

Welcome to **Fleet Chat** plugin system!
      
This is your new plugin. Start building amazing functionality!
      
## Next Steps

1. Edit src/index.ts to add your commands
2. Run pnpm dev to test your changes
3. Check the Fleet Chat documentation for more APIs
4. Build cool stuff! 🚀

## Useful Resources

- [Fleet Chat Plugin Docs](https://github.com/sternelee/fleet-chat/blob/main/PLUGIN_SYSTEM.md)
- [API Reference](https://github.com/sternelee/fleet-chat/blob/main/packages/fleet-chat-api/)
- [Plugin Examples](https://github.com/sternelee/fleet-chat/tree/main/src/plugins/examples/)

Have fun building your plugin!`;
  
  return {
    type: 'Detail',
    props: {
      markdown: markdownContent
    }
  };
}

export async function testpluginList() {
  const items = [
    {
      title: "Item 1",
      subtitle: "This is the first item",
      icon: "🎯",
      keywords: ["first", "example"]
    },
    {
      title: "Item 2", 
      subtitle: "This is the second item",
      icon: "⚡",
      keywords: ["second", "example"]
    }
  ];

  return {
    type: 'List',
    props: {
      items: items.map((item, index) => ({
        key: index,
        title: item.title,
        subtitle: item.subtitle,
        icon: item.icon,
        keywords: item.keywords,
        actions: {
          type: 'ActionPanel',
          props: {
            actions: [
              {
                type: 'Action',
                props: {
                  title: "Select Item",
                  icon: "✅",
                  onAction: () => {
                    showToast({
                      title: "Selected",
                      message: `You selected ${item.title}`,
                      style: "success"
                    });
                  }
                }
              },
              {
                type: 'Action',
                props: {
                  title: "More Info",
                  icon: "ℹ️",
                  onAction: () => {
                    showToast({
                      title: "Item Info",
                      message: `Keywords: ${item.keywords.join(', ')}`,
                      style: "info"
                    });
                  }
                }
              }
            ]
          }
        }
      }))
    }
  };
}

export const utils = {
  formatGreeting: (name: string) => {
    return `Hello, ${name}! Welcome to testplugin plugin.`;
  },
  
  getRandomNumber: () => {
    return Math.floor(Math.random() * 1000);
  },
  
  getCurrentTime: () => {
    return new Date().toLocaleTimeString();
  }
};
