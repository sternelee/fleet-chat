/**
 * test-plugin Plugin for Fleet Chat
 */

import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Hello from test-plugin!"
        subtitle="This is your Fleet Chat plugin"
        actions={
          <ActionPanel>
            <Action
              title="Say Hello"
              onAction={() => {
                showToast({
                  title: "Hello!",
                  message: "Welcome to Fleet Chat plugin development"
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
