/**
 * Form Input Plugin for Fleet Chat
 *
 * Demonstrates form input, validation, and preferences
 */

import {
  List,
  Form,
  Form.Dropdown,
  Form.TextArea,
  Form.TextField,
  Form.PasswordField,
  Form.Separator,
  Form.Checkbox,
  ActionPanel,
  Action,
  showToast,
  showHUD,
  CloseWindowAction,
  preferences,
} from '@fleet-chat/core-api';
import { useState, useEffect } from '@fleet-chat/core-api';

// Interfaces for our data
interface QuickNote {
  title: string;
  content: string;
  timestamp: number;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  done: boolean;
}

interface Settings {
  username: string;
  email: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
}

// In-memory storage for demo
const notes: QuickNote[] = [];
const todos: TodoItem[] = [];

// Preference values (if available)
let userPrefs: { defaultCity?: string; temperatureUnit?: string } = {};
try {
  userPrefs = preferences.all();
} catch {
  // Preferences not available in this context
}

// Default command - Quick Note form
export default function Command() {
  const [submittedNotes, setSubmittedNotes] = useState<QuickNote[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" />
          <Action
            title="View Notes"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              if (notes.length === 0) {
                showToast({
                  title: "No Notes",
                  message: "You haven't created any notes yet",
                  style: "info"
                });
              } else {
                showToast({
                  title: `${notes.length} Note${notes.length > 1 ? 's' : ''}`,
                  message: notes.map(n => n.title).join(', '),
                  style: "success"
                });
              }
            }}
          />
          <CloseWindowAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Note Title"
        placeholder="Enter note title"
        defaultValue=""
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter your note content here..."
        defaultValue=""
      />

      <Form.Separator />

      <Form.Dropdown
        id="category"
        title="Category"
        options={[
          { title: 'Personal', value: 'personal' },
          { title: 'Work', value: 'work' },
          { title: 'Ideas', value: 'ideas' },
          { title: 'Other', value: 'other' }
        ]}
        defaultValue="personal"
      />

      <Form.Checkbox
        id="pin"
        label="Pin to top"
        defaultValue={false}
      />

      <Form.Separator />

      <Form.TextArea
        id="tags"
        title="Tags (comma-separated)"
        placeholder="tag1, tag2, tag3"
        defaultValue=""
      />
    </Form>
  );
}

// Named command - Todo Form
export function todo() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Todo"
            onSubmit={(values) => {
              const todo: TodoItem = {
                id: Date.now().toString(),
                title: values.title as string,
                description: values.description as string || '',
                priority: values.priority as TodoItem['priority'] || 'medium',
                done: false
              };
              todos.push(todo);
              showToast({
                title: "Todo Added",
                message: `Added: ${todo.title}`,
                style: "success"
              });
            }}
          />
          <Action
            title="Show All Todos"
            onAction={() => {
              if (todos.length === 0) {
                showToast({
                  title: "No Todos",
                  message: "Your todo list is empty",
                  style: "info"
                });
              } else {
                const pending = todos.filter(t => !t.done).length;
                showToast({
                  title: `${pending} Pending Todo${pending > 1 ? 's' : ''}`,
                  message: `${todos.length} total todos`,
                  style: "info"
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Todo Title"
        placeholder="What needs to be done?"
        defaultValue=""
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add more details..."
        defaultValue=""
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        options={[
          { title: 'High', value: 'high' },
          { title: 'Medium', value: 'medium' },
          { title: 'Low', value: 'low' }
        ]}
        defaultValue="medium"
      />

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        defaultValue={new Date()}
      />

      <Form.Checkbox
        id="urgent"
        label="Mark as Urgent"
        defaultValue={false}
      />

      <Form.Separator />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="work, important, today"
        defaultValue=""
      />
    </Form>
  );
}

// Named command - Settings Form
export function settings() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            onSubmit={(values) => {
              showToast({
                title: "Settings Saved",
                message: `Profile updated for ${values.username}`,
                style: "success"
              });
            }}
          />
          <Action
            title="Reset to Defaults"
            style="destructive"
            onAction={() => {
              showToast({
                title: "Reset",
                message: "Settings have been reset to defaults",
                style: "warning"
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="username"
        title="Username"
        placeholder="Enter your username"
        defaultValue=""
      />

      <Form.Separator />

      <Form.TextField
        id="email"
        title="Email"
        placeholder="your.email@example.com"
        defaultValue=""
      />

      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter password (optional)"
        defaultValue=""
      />

      <Form.Separator />

      <Form.Dropdown
        id="theme"
        title="Theme"
        options={[
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
          { title: 'Auto', value: 'auto' }
        ]}
        defaultValue="auto"
      />

      <Form.Separator />

      <Form.Checkbox
        id="notifications"
        label="Enable Notifications"
        defaultValue={true}
      />

      <Form.Checkbox
        id="sounds"
        label="Enable Sounds"
        defaultValue={true}
      />

      <Form.Checkbox
        id="analytics"
        label="Send Anonymous Usage Data"
        defaultValue={false}
      />

      <Form.Separator />

      <Form.TextArea
        id="bio"
        title="Bio"
        placeholder="Tell us about yourself..."
        defaultValue=""
      />
    </Form>
  );
}
