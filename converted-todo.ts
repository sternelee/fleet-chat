import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { List } from '@fleet-chat/api/raycast-compat';
import { editingAtom, selectedTagAtom, searchBarTextAtom, searchModeAtom } from "./atoms";
import { useAtom } from "jotai";
import TodoSection from "./todo_section";
import ListActions from "./list_actions";
import ListTags from "./list_tags";

@customElement("TodoList".toLowerCase())
class TodoList extends LitElement {() {
  const [searchMode] = useAtom(searchModeAtom);
  const [searchBarText, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing] = useAtom(editingAtom);
  const [selectedTag] = useAtom(selectedTagAtom);

  return html`
    <List
      actions={<ListActions />}
      filtering={searchMode}
      key={searchMode ? "search" : "nosearch"}
      navigationTitle={`Manage Todo List${editing !== false ? " • Editing" : searchMode ? " • Searching" : ""}`}
      onSearchTextChange={(text: string) => setSearchBarText(text)}
      searchBarAccessory={<ListTags />}
      searchBarPlaceholder={searchMode ? "Search todos" : "Type and hit enter to add an item to your list"}
      searchText={searchBarText}
    >
      <TodoSection sectionKey="pinned" selectedTag={selectedTag} />
      <TodoSection sectionKey="todo" selectedTag={selectedTag} />
      <TodoSection sectionKey="completed" selectedTag={selectedTag} />
    </List>
  );
}


export default TodoList;