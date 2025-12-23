/**
 * test-plugin Plugin for Fleet Chat
 */

import { Action, ActionPanel, type List, showToast } from '@fleet-chat/raycast-api';
import React from 'react';

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
