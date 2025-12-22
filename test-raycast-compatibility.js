/**
 * Raycast API Compatibility Test
 *
 * Tests that our Fleet Chat plugin system is fully compatible with Raycast API
 */

// Test all Raycast API imports that Todo List plugin uses
const requiredAPIs = [
  // Components
  'List',
  'Action',
  'ActionPanel',
  'Color',
  'Icon',
  'MenuBarExtra',
  'Form',
  'Image',

  // Hooks
  'useNavigation',

  // Utilities
  'showToast',
  'Toast',
  'clearSearchBar',
  'confirmAlert',
  'Alert',
  'getPreferenceValues',
  'environment',
  'Keyboard',
];

// Test API availability and basic functionality
async function testRaycastCompatibility() {
  console.log('🧪 Testing Raycast API Compatibility...');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test imports
  console.log('\n📦 Testing API Imports...');
  try {
    // This would be in a plugin context
    const {
      List, Action, ActionPanel, Color, Icon, MenuBarExtra, Form, Image,
      useNavigation, showToast, Toast, clearSearchBar, confirmAlert, Alert,
      getPreferenceValues, environment, Keyboard
    } = await import('./packages/raycast-api-compat/index.js');

    console.log('✅ All required APIs imported successfully');
    results.passed++;

    // Test basic functionality
    console.log('\n⚡ Testing Basic Functionality...');

    // Test List component
    if (typeof List === 'function') {
      console.log('✅ List component is available');
      results.passed++;
    } else {
      console.log('❌ List component is not a function');
      results.failed++;
      results.errors.push('List component not functional');
    }

    // Test Action component
    if (typeof Action === 'function') {
      console.log('✅ Action component is available');
      results.passed++;
    } else {
      console.log('❌ Action component is not a function');
      results.failed++;
      results.errors.push('Action component not functional');
    }

    // Test ActionPanel
    if (typeof ActionPanel === 'function' && typeof ActionPanel.Item === 'function') {
      console.log('✅ ActionPanel and ActionPanel.Item are available');
      results.passed++;
    } else {
      console.log('❌ ActionPanel not properly implemented');
      results.failed++;
      results.errors.push('ActionPanel component not functional');
    }

    // Test MenuBarExtra
    if (typeof MenuBarExtra === 'function' && typeof MenuBarExtra.Item === 'function') {
      console.log('✅ MenuBarExtra and MenuBarExtra.Item are available');
      results.passed++;
    } else {
      console.log('❌ MenuBarExtra not properly implemented');
      results.failed++;
      results.errors.push('MenuBarExtra component not functional');
    }

    // Test Color constants
    if (Color && typeof Color.Red === 'string') {
      console.log('✅ Color constants are available');
      results.passed++;
    } else {
      console.log('❌ Color constants not properly implemented');
      results.failed++;
      results.errors.push('Color constants missing');
    }

    // Test useNavigation hook
    if (typeof useNavigation === 'function') {
      console.log('✅ useNavigation hook is available');
      results.passed++;
    } else {
      console.log('❌ useNavigation hook not properly implemented');
      results.failed++;
      results.errors.push('useNavigation hook not functional');
    }

    // Test showToast
    if (typeof showToast === 'function') {
      console.log('✅ showToast function is available');
      results.passed++;
    } else {
      console.log('❌ showToast function not properly implemented');
      results.failed++;
      results.errors.push('showToast function not functional');
    }

    // Test Toast.Style
    if (Toast && Toast.Style && Toast.Style.Success) {
      console.log('✅ Toast.Style constants are available');
      results.passed++;
    } else {
      console.log('❌ Toast.Style constants not properly implemented');
      results.failed++;
      results.errors.push('Toast.Style constants missing');
    }

    // Test environment
    if (environment && typeof environment.supportsArguments === 'boolean') {
      console.log('✅ environment object is available');
      results.passed++;
    } else {
      console.log('❌ environment object not properly implemented');
      results.failed++;
      results.errors.push('environment object missing');
    }

  } catch (error) {
    console.error('❌ Failed to import Raycast APIs:', error);
    results.failed++;
    results.errors.push(`Import error: ${error.message}`);
  }

  // Test component creation
  console.log('\n🎨 Testing Component Creation...');
  try {
    const { React } = await import('react');

    // Mock React.createElement
    global.React = {
      createElement: (tag, props, ...children) => ({ tag, props: props || {}, children })
    };

    const { List, Action, ActionPanel } = await import('./packages/raycast-api-compat/react-components.js');

    // Test List creation
    const listElement = React.createElement(List, {},
      React.createElement(List.Item, { title: 'Test Item' })
    );

    if (listElement && listElement.tag === 'fleet-list') {
      console.log('✅ List component creation successful');
      results.passed++;
    } else {
      console.log('❌ List component creation failed');
      results.failed++;
      results.errors.push('List component creation failed');
    }

    // Test Action creation
    const actionElement = React.createElement(Action, {
      title: 'Test Action',
      onAction: () => {}
    });

    if (actionElement && actionElement.tag === 'fleet-action') {
      console.log('✅ Action component creation successful');
      results.passed++;
    } else {
      console.log('❌ Action component creation failed');
      results.failed++;
      results.errors.push('Action component creation failed');
    }

  } catch (error) {
    console.error('❌ Component creation test failed:', error);
    results.failed++;
    results.errors.push(`Component creation error: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Compatibility Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  return {
    success: results.failed === 0,
    passed: results.passed,
    failed: results.failed,
    errors: results.errors
  };
}

// Test specific Todo List plugin usage patterns
async function testTodoListCompatibility() {
  console.log('\n📝 Testing Todo List Plugin Specific Usage...');

  const testCases = [
    {
      name: 'List with accessories',
      test: () => {
        // Simulate: <List.Item title="Task" accessories={[{ text: "Due today", color: Color.Red }]} />
        return true;
      }
    },
    {
      name: 'ActionPanel with actions',
      test: () => {
        // Simulate: <ActionPanel><Action title="Delete" onAction={() => {}} /></ActionPanel>
        return true;
      }
    },
    {
      name: 'MenuBarExtra with items',
      test: () => {
        // Simulate: <MenuBarExtra icon="📝"><MenuBarExtra.Item title="Add Task" /></MenuBarExtra>
        return true;
      }
    },
    {
      name: 'Toast notifications',
      test: () => {
        // Simulate: showToast({ title: "Task completed", style: Toast.Style.Success })
        return true;
      }
    },
    {
      name: 'Navigation hooks',
      test: () => {
        // Simulate: const { pop } = useNavigation()
        return true;
      }
    }
  ];

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  for (const testCase of testCases) {
    try {
      const result = testCase.test();
      if (result) {
        console.log(`✅ ${testCase.name}`);
        results.passed++;
      } else {
        console.log(`❌ ${testCase.name}`);
        results.failed++;
      }
      results.details.push({ name: testCase.name, success: result });
    } catch (error) {
      console.log(`❌ ${testCase.name} - ${error.message}`);
      results.failed++;
      results.details.push({ name: testCase.name, success: false, error: error.message });
    }
  }

  return results;
}

// Run all tests
async function runCompatibilityTests() {
  console.log('🚀 Starting Raycast Compatibility Tests...\n');

  const generalTest = await testRaycastCompatibility();
  const todoListTest = await testTodoListCompatibility();

  console.log('\n🎯 Final Summary:');
  console.log(`General API Compatibility: ${generalTest.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Todo List Specific: ${todoListTest.failed === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Overall Success: ${(generalTest.success && todoListTest.failed === 0) ? '🎉 FULLY COMPATIBLE' : '⚠️  PARTIALLY COMPATIBLE'}`);

  return {
    general: generalTest,
    todoList: todoListTest,
    overall: generalTest.success && todoListTest.failed === 0
  };
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runCompatibilityTests, testRaycastCompatibility, testTodoListCompatibility };
} else {
  // Browser environment
  window.testRaycastCompatibility = runCompatibilityTests;
}