/**
 * Test Raycast API imports for Todo List compatibility
 */

// Test the exact imports that Todo List uses
const todoListImports = [
  'Action',
  'ActionPanel',
  'Color',
  'Icon',
  'List',
  'useNavigation',
  'Alert',
  'confirmAlert',
  'showToast',
  'Toast',
  'clearSearchBar',
  'Form',
  'getPreferenceValues',
  'environment',
  'Image',
  'Keyboard',
  'MenuBarExtra'
];

console.log('🧪 Testing Raycast API imports for Todo List plugin...\n');

async function testImports() {
  try {
    // Test importing from the compatibility layer
    const api = await import('./packages/fleet-chat-api/index.js');

    let successCount = 0;
    let failCount = 0;
    const missingAPIs = [];

    console.log('📦 Checking API availability:');

    for (const apiName of todoListImports) {
      if (api[apiName]) {
        console.log(`✅ ${apiName}`);
        successCount++;

        // Test specific API structures
        if (apiName === 'Color' && api.Color.Red) {
          console.log(`  - Color.Red: ${api.Color.Red}`);
        }
        if (apiName === 'Toast' && api.Toast.Style) {
          console.log(`  - Toast.Style available: ${Object.keys(api.Toast.Style).join(', ')}`);
        }
        if (apiName === 'environment' && api.environment.theme) {
          console.log(`  - environment.theme: ${api.environment.theme}`);
        }
      } else {
        console.log(`❌ ${apiName} - MISSING`);
        failCount++;
        missingAPIs.push(apiName);
      }
    }

    console.log('\n📊 Results:');
    console.log(`✅ Available: ${successCount}/${todoListImports.length}`);
    console.log(`❌ Missing: ${failCount}`);

    if (missingAPIs.length > 0) {
      console.log('\n❌ Missing APIs:', missingAPIs.join(', '));
    }

    // Test basic component creation
    console.log('\n🎨 Testing component creation:');

    try {
      // Mock React.createElement for testing
      global.React = {
        createElement: (tag, props = {}, ...children) => ({
          tag: typeof tag === 'function' ? tag.name : tag,
          props,
          children: children.flat()
        })
      };

      const { List, Action, ActionPanel, MenuBarExtra } = api;

      // Test List component
      const listElement = global.React.createElement(List, {
        searchBarPlaceholder: "Search todos..."
      });
      console.log('✅ List component created:', listElement.tag);

      // Test Action component
      const actionElement = global.React.createElement(Action, {
        title: "Delete Todo",
        onAction: () => {}
      });
      console.log('✅ Action component created:', actionElement.tag);

      // Test ActionPanel
      const actionPanelElement = global.React.createElement(ActionPanel, {},
        global.React.createElement(ActionPanel.Item, { title: "Edit" })
      );
      console.log('✅ ActionPanel component created:', actionPanelElement.tag);

      // Test MenuBarExtra
      const menuBarElement = global.React.createElement(MenuBarExtra, {
        title: "Todos"
      });
      console.log('✅ MenuBarExtra component created:', menuBarElement.tag);

    } catch (error) {
      console.error('❌ Component creation test failed:', error.message);
    }

    const successRate = Math.round((successCount / todoListImports.length) * 100);
    console.log(`\n🎯 Overall compatibility: ${successRate}%`);

    if (successRate === 100) {
      console.log('🎉 FULLY COMPATIBLE - Todo List plugin should work!');
    } else if (successRate >= 80) {
      console.log('⚠️  MOSTLY COMPATIBLE - Some features may not work');
    } else {
      console.log('❌ NOT COMPATIBLE - Significant issues found');
    }

    return {
      success: failCount === 0,
      successCount,
      failCount,
      missingAPIs,
      successRate
    };

  } catch (error) {
    console.error('❌ Import test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testImports().then(result => {
  console.log('\n✨ Test completed!');
}).catch(error => {
  console.error('💥 Test failed:', error);
});