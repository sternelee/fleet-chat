use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

use super::agent::{A2UIAgent, A2UIAgentError};

/// Plugin generation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginGenerationRequest {
    pub session_id: String,
    pub description: String,
    pub plugin_name: Option<String>,
    pub commands: Option<Vec<CommandSpec>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandSpec {
    pub name: String,
    pub title: String,
    pub description: String,
    pub mode: String, // "view" or "no-view"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub title: String,
    pub description: String,
    pub author: String,
    pub icon: String,
    pub commands: Vec<PluginCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCommand {
    pub name: String,
    pub title: String,
    pub description: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedPlugin {
    pub manifest: PluginManifest,
    pub source_code: String,
    pub a2ui_components: Vec<serde_json::Value>,
}

#[derive(Debug, Error)]
pub enum PluginGeneratorError {
    #[error("A2UI Agent error: {0}")]
    AgentError(#[from] A2UIAgentError),
    #[error("Invalid plugin specification: {0}")]
    InvalidSpec(String),
    #[error("Code generation failed: {0}")]
    CodeGenerationError(String),
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

pub struct A2UIPluginGenerator {
    agent: A2UIAgent,
}

impl A2UIPluginGenerator {
    pub fn new(agent: A2UIAgent) -> Self {
        Self { agent }
    }

    /// Generate a Fleet Chat plugin from a user description
    pub async fn generate_plugin(
        &self,
        request: PluginGenerationRequest,
    ) -> Result<GeneratedPlugin, PluginGeneratorError> {
        // Build a specialized prompt for plugin generation
        let prompt = self.build_plugin_generation_prompt(&request);

        // Use A2UI agent to generate the plugin structure
        let response = self
            .agent
            .handle_message(&request.session_id, &prompt, true)
            .await?;

        // Parse the response to extract plugin manifest and code
        self.parse_plugin_response(&request, &response.content, response.a2ui_messages)
    }

    fn build_plugin_generation_prompt(&self, request: &PluginGenerationRequest) -> String {
        let mut prompt = String::new();

        prompt.push_str("You are a Fleet Chat plugin generator. Your task is to generate a complete Fleet Chat plugin based on the user's description.\n\n");

        prompt.push_str("PLUGIN STRUCTURE:\n");
        prompt.push_str("Fleet Chat plugins consist of:\n");
        prompt.push_str("1. A package.json manifest with plugin metadata and commands\n");
        prompt.push_str("2. TypeScript/React source code implementing the commands\n");
        prompt.push_str("3. A2UI components for the plugin UI (optional)\n\n");

        prompt.push_str("FLEET CHAT PLUGIN API:\n");
        prompt.push_str("Plugins use React and can import from '@fleet-chat/raycast-api':\n");
        prompt.push_str("- UI Components: List, Grid, Detail, Form, ActionPanel, Action\n");
        prompt.push_str("- System APIs: showToast, showHUD, Clipboard, LocalStorage\n");
        prompt.push_str("- Navigation: push, pop, popToRoot\n\n");

        prompt.push_str("PLUGIN GENERATION TASK:\n");
        prompt.push_str(&format!("Description: {}\n", request.description));

        if let Some(ref plugin_name) = request.plugin_name {
            prompt.push_str(&format!("Plugin Name: {}\n", plugin_name));
        }

        if let Some(ref commands) = request.commands {
            prompt.push_str("Commands:\n");
            for cmd in commands {
                prompt.push_str(&format!(
                    "  - {}: {} (mode: {})\n",
                    cmd.name, cmd.title, cmd.mode
                ));
            }
        }

        prompt.push_str("\nGENERATION OUTPUT:\n");
        prompt.push_str("Please generate:\n");
        prompt.push_str("1. A complete package.json manifest\n");
        prompt.push_str("2. TypeScript source code for the plugin\n");
        prompt.push_str("3. A2UI components if the plugin needs dynamic UI generation\n\n");

        prompt.push_str("FORMAT YOUR RESPONSE AS:\n");
        prompt.push_str("MANIFEST:\n```json\n{...package.json content...}\n```\n\n");
        prompt.push_str("SOURCE_CODE:\n```typescript\n{...plugin source code...}\n```\n\n");
        prompt.push_str("A2UI_COMPONENTS: (if applicable)\n{...A2UI messages...}\n\n");

        prompt.push_str("EXAMPLE PLUGIN STRUCTURE:\n");
        prompt.push_str("```typescript\n");
        prompt.push_str("import React from 'react';\n");
        prompt.push_str("import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';\n\n");
        prompt.push_str("export default function Command() {\n");
        prompt.push_str("  return (\n");
        prompt.push_str("    <List>\n");
        prompt.push_str("      <List.Item\n");
        prompt.push_str("        title=\"Hello World\"\n");
        prompt.push_str("        actions={\n");
        prompt.push_str("          <ActionPanel>\n");
        prompt.push_str("            <Action\n");
        prompt.push_str("              title=\"Say Hello\"\n");
        prompt.push_str("              onAction={() => showToast({ title: \"Hello!\" })}\n");
        prompt.push_str("            />\n");
        prompt.push_str("          </ActionPanel>\n");
        prompt.push_str("        }\n");
        prompt.push_str("      />\n");
        prompt.push_str("    </List>\n");
        prompt.push_str("  );\n");
        prompt.push_str("}\n");
        prompt.push_str("```\n\n");

        prompt.push_str("Now generate the complete plugin based on the description above.\n");

        prompt
    }

    fn parse_plugin_response(
        &self,
        request: &PluginGenerationRequest,
        content: &str,
        a2ui_messages: Vec<super::agent::A2UIMessageResponse>,
    ) -> Result<GeneratedPlugin, PluginGeneratorError> {
        // Extract manifest from MANIFEST: section
        let manifest = self.extract_manifest(content, request)?;

        // Extract source code from SOURCE_CODE: section
        let source_code = self.extract_source_code(content)?;

        // Convert A2UI messages to JSON values
        let a2ui_components: Vec<serde_json::Value> = a2ui_messages
            .iter()
            .map(|msg| serde_json::to_value(msg).unwrap_or(serde_json::Value::Null))
            .collect();

        Ok(GeneratedPlugin {
            manifest,
            source_code,
            a2ui_components,
        })
    }

    fn extract_manifest(
        &self,
        content: &str,
        request: &PluginGenerationRequest,
    ) -> Result<PluginManifest, PluginGeneratorError> {
        // Look for MANIFEST: section with JSON
        if let Some(manifest_start) = content.find("MANIFEST:") {
            let manifest_content = &content[manifest_start..];
            if let Some(json_start) = manifest_content.find("```json") {
                if let Some(json_end) = manifest_content[json_start..].find("```\n") {
                    let json_str =
                        &manifest_content[json_start + 7..json_start + json_end].trim();
                    let manifest_value: serde_json::Value = serde_json::from_str(json_str)?;

                    return self.manifest_from_json(&manifest_value, request);
                }
            }
        }

        // Fallback: generate a default manifest
        self.generate_default_manifest(request)
    }

    fn manifest_from_json(
        &self,
        value: &serde_json::Value,
        request: &PluginGenerationRequest,
    ) -> Result<PluginManifest, PluginGeneratorError> {
        let name = value
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or_else(|| request.plugin_name.as_deref().unwrap_or("generated-plugin"))
            .to_string();

        let title = value
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or(&name)
            .to_string();

        let description = value
            .get("description")
            .and_then(|v| v.as_str())
            .unwrap_or(&request.description)
            .to_string();

        let version = value
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("1.0.0")
            .to_string();

        let author = value
            .get("author")
            .and_then(|v| v.as_str())
            .unwrap_or("A2UI Generator")
            .to_string();

        let icon = value
            .get("icon")
            .and_then(|v| v.as_str())
            .unwrap_or("🤖")
            .to_string();

        let commands = if let Some(cmds) = value.get("commands").and_then(|v| v.as_array()) {
            cmds.iter()
                .filter_map(|cmd| {
                    let name = cmd.get("name")?.as_str()?;
                    let title = cmd.get("title")?.as_str()?;
                    let description = cmd.get("description")?.as_str().unwrap_or("");
                    let mode = cmd.get("mode")?.as_str()?;

                    Some(PluginCommand {
                        name: name.to_string(),
                        title: title.to_string(),
                        description: description.to_string(),
                        mode: mode.to_string(),
                    })
                })
                .collect()
        } else if let Some(ref cmds) = request.commands {
            cmds.iter()
                .map(|cmd| PluginCommand {
                    name: cmd.name.clone(),
                    title: cmd.title.clone(),
                    description: cmd.description.clone(),
                    mode: cmd.mode.clone(),
                })
                .collect()
        } else {
            vec![PluginCommand {
                name: "default".to_string(),
                title: title.clone(),
                description: description.clone(),
                mode: "view".to_string(),
            }]
        };

        Ok(PluginManifest {
            name,
            version,
            title,
            description,
            author,
            icon,
            commands,
        })
    }

    fn generate_default_manifest(
        &self,
        request: &PluginGenerationRequest,
    ) -> Result<PluginManifest, PluginGeneratorError> {
        let name = request
            .plugin_name
            .clone()
            .unwrap_or_else(|| "generated-plugin".to_string());

        let commands = if let Some(ref cmds) = request.commands {
            cmds.iter()
                .map(|cmd| PluginCommand {
                    name: cmd.name.clone(),
                    title: cmd.title.clone(),
                    description: cmd.description.clone(),
                    mode: cmd.mode.clone(),
                })
                .collect()
        } else {
            vec![PluginCommand {
                name: "default".to_string(),
                title: name.clone(),
                description: request.description.clone(),
                mode: "view".to_string(),
            }]
        };

        Ok(PluginManifest {
            name: name.clone(),
            version: "1.0.0".to_string(),
            title: name,
            description: request.description.clone(),
            author: "A2UI Generator".to_string(),
            icon: "🤖".to_string(),
            commands,
        })
    }

    fn extract_source_code(&self, content: &str) -> Result<String, PluginGeneratorError> {
        // Look for SOURCE_CODE: section with TypeScript
        if let Some(code_start) = content.find("SOURCE_CODE:") {
            let code_content = &content[code_start..];
            if let Some(ts_start) = code_content.find("```typescript") {
                if let Some(ts_end) = code_content[ts_start..].find("```\n") {
                    let code = &code_content[ts_start + 13..ts_start + ts_end].trim();
                    return Ok(code.to_string());
                }
            }
            // Try JavaScript code block
            if let Some(js_start) = code_content.find("```javascript") {
                if let Some(js_end) = code_content[js_start..].find("```\n") {
                    let code = &code_content[js_start + 13..js_start + js_end].trim();
                    return Ok(code.to_string());
                }
            }
        }

        // Fallback: generate default source code
        Ok(self.generate_default_source_code())
    }

    fn generate_default_source_code(&self) -> String {
        r#"import React from 'react';
import { List, ActionPanel, Action, showToast } from '@fleet-chat/raycast-api';

export default function Command() {
  return (
    <List>
      <List.Item
        title="Generated Plugin"
        subtitle="This plugin was generated by A2UI"
        actions={
          <ActionPanel>
            <Action
              title="Run Action"
              onAction={() => {
                showToast({
                  title: "Success",
                  message: "Plugin action executed"
                });
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
"#
        .to_string()
    }
}
