#!/bin/bash

# Fleet Chat Plugin Test Runner
# 用于测试所有插件的功能和兼容性

set -e

echo "🧪 Fleet Chat Plugin Test Suite"
echo "================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# 运行测试
echo "Running plugin tests..."
node test/plugin-tests/plugin-test-runner.ts examples

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed!"
    echo "Plugin system is ready for production use."
else
    echo ""
    echo "❌ Some tests failed."
    echo "Please review the errors above and fix the issues."
    exit 1
fi