/**
 * Test Plugin for Fleet Chat
 */

import { showHUD, showToast, Toast } from '@fleet-chat/api/raycast-compat';

export default async function TestCommand() {
  try {
    await showToast({
      style: Toast.Style.Success,
      title: 'Test Plugin Loaded Successfully!',
      message: 'This is a test plugin for Fleet Chat',
    });

    await showHUD('✅ Test Plugin Working!');

    return 'Test plugin executed successfully';
  } catch (error) {
    console.error('Test plugin error:', error);
    await showToast({
      style: Toast.Style.Failure,
      title: 'Test Plugin Failed',
      message: error.message,
    });
    throw error;
  }
}