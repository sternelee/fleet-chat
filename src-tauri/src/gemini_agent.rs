use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub content: String,
    pub role: MessageRole,
    pub timestamp: DateTime<Utc>,
    pub metadata: Option<MessageMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub model_used: Option<String>,
    pub tokens_used: Option<u32>,
    pub suggested_ui_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub message_id: String,
    pub content: String,
    pub suggested_ui_type: Option<String>,
    pub conversation_state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSession {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub messages: Vec<ChatMessage>,
    pub context: SessionContext,
    pub settings: AgentSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionContext {
    pub user_intent: Option<String>,
    pub current_task: Option<String>,
    pub entities: HashMap<String, String>,
    pub conversation_state: ConversationState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConversationState {
    Greeting,
    TaskUnderstanding,
    TaskExecution,
    Clarification,
    Completion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSettings {
    pub model_name: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub system_prompt: String,
    pub persona: AgentPersona,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPersona {
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub interaction_style: String,
}

#[derive(Debug, Clone)]
pub struct GeminiAgent {
    pub client: Client,
    pub api_key: String,
    pub sessions: Arc<RwLock<HashMap<String, AgentSession>>>,
    pub default_settings: AgentSettings,
}

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Invalid message format: {0}")]
    InvalidMessage(String),
    #[error("Gemini API error: {0}")]
    GeminiError(String),
    #[error("UI generation error: {0}")]
    UIGenerationError(String),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    #[error("HTTP client error: {0}")]
    HttpError(#[from] reqwest::Error),
}

impl GeminiAgent {
    pub fn new(api_key: String) -> Result<Self, AgentError> {
        let client = Client::new();

        let default_settings = AgentSettings {
            model_name: "gemini-2.5-flash".to_string(),
            temperature: 0.7,
            max_tokens: 2048,
            system_prompt: "你是一个智能助手，能够理解用户需求并提供建议。你可以帮助用户分析需求并建议合适的解决方案。当用户需要界面时，你可以建议使用哪种类型的UI组件。".to_string(),
            persona: AgentPersona {
                name: "Fleet Assistant".to_string(),
                description: "智能助手".to_string(),
                capabilities: vec![
                    "需求分析".to_string(),
                    "解决方案建议".to_string(),
                    "界面设计建议".to_string(),
                    "技术指导".to_string(),
                ],
                interaction_style: "友好、专业、高效".to_string(),
            },
        };

        Ok(GeminiAgent {
            client,
            api_key,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            default_settings,
        })
    }

    async fn create_session_with_id(
        &self,
        session_id: &str,
        custom_settings: Option<AgentSettings>,
    ) -> Result<(), AgentError> {
        let now = Utc::now();
        let settings = custom_settings.unwrap_or_else(|| self.default_settings.clone());

        let session = AgentSession {
            id: session_id.to_string(),
            created_at: now,
            updated_at: now,
            messages: Vec::new(),
            context: SessionContext {
                user_intent: None,
                current_task: None,
                entities: HashMap::new(),
                conversation_state: ConversationState::Greeting,
            },
            settings,
        };

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.to_string(), session);
        Ok(())
    }

    pub async fn create_session(&self, custom_settings: Option<AgentSettings>) -> Result<String, AgentError> {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let session = AgentSession {
            id: session_id.clone(),
            created_at: now,
            updated_at: now,
            messages: Vec::new(),
            context: SessionContext {
                user_intent: None,
                current_task: None,
                entities: HashMap::new(),
                conversation_state: ConversationState::Greeting,
            },
            settings: custom_settings.unwrap_or(self.default_settings.clone()),
        };

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    pub async fn get_session(&self, session_id: &str) -> Result<AgentSession, AgentError> {
        let sessions = self.sessions.read().await;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| AgentError::SessionNotFound(session_id.to_string()))
    }

    pub async fn send_message(&self, session_id: &str, content: String) -> Result<AgentResponse, AgentError> {
        // Auto-create session if it doesn't exist
        if !self.sessions.read().await.contains_key(session_id) {
            self.create_session_with_id(session_id, None).await?;
        }

        let user_message = ChatMessage {
            id: Uuid::new_v4().to_string(),
            content: content.clone(),
            role: MessageRole::User,
            timestamp: Utc::now(),
            metadata: None,
        };

        let mut sessions = self.sessions.write().await;
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| AgentError::SessionNotFound(session_id.to_string()))?;

        session.messages.push(user_message);
        session.updated_at = Utc::now();

        // Update conversation context
        let content_lower = content.to_lowercase();
        if content_lower.contains("你好") || content_lower.contains("hello") {
            session.context.conversation_state = ConversationState::Greeting;
        } else if content_lower.contains("显示") || content_lower.contains("展示") || content_lower.contains("show")
        {
            session.context.conversation_state = ConversationState::TaskExecution;
            session.context.user_intent = Some("display_information".to_string());
        } else if content_lower.contains("搜索") || content_lower.contains("查找") || content_lower.contains("search")
        {
            session.context.conversation_state = ConversationState::TaskExecution;
            session.context.user_intent = Some("search".to_string());
        } else if content_lower.contains("?") || content_lower.contains("？") {
            session.context.conversation_state = ConversationState::TaskUnderstanding;
        } else {
            session.context.conversation_state = ConversationState::TaskExecution;
        }

        // Generate response using Gemini
        let response_content = self.generate_gemini_response(&session).await?;

        // Analyze content to suggest UI type
        let suggested_ui_type = self.analyze_ui_suggestion(&response_content);

        let assistant_message = ChatMessage {
            id: Uuid::new_v4().to_string(),
            content: response_content.clone(),
            role: MessageRole::Assistant,
            timestamp: Utc::now(),
            metadata: Some(MessageMetadata {
                model_used: Some(session.settings.model_name.clone()),
                tokens_used: None,
                suggested_ui_type: suggested_ui_type.clone(),
            }),
        };

        session.messages.push(assistant_message);
        session.updated_at = Utc::now();

        Ok(AgentResponse {
            message_id: Uuid::new_v4().to_string(),
            content: response_content,
            suggested_ui_type,
            conversation_state: format!("{:?}", session.context.conversation_state),
        })
    }

    async fn generate_gemini_response(&self, session: &AgentSession) -> Result<String, AgentError> {
        let conversation_history: Vec<String> = session
            .messages
            .iter()
            .map(|msg| {
                format!(
                    "{}: {}",
                    match msg.role {
                        MessageRole::User => "User",
                        MessageRole::Assistant => "Assistant",
                        MessageRole::System => "System",
                    },
                    msg.content
                )
            })
            .collect();

        let prompt = format!(
            "{}\n\n系统设定: {}\n\n对话历史:\n{}\n\n请根据用户的最新消息，提供一个有帮助的回复。如果用户需要查看信息，请建议合适的展示方式。",
            session.settings.system_prompt,
            session.settings.persona.description,
            conversation_history.join("\n")
        );

        // Call Gemini API or fallback to mock for testing
        let response = if !self.api_key.is_empty() && self.api_key != "test-api-key" {
            self.call_gemini_api(&prompt).await?
        } else {
            self.mock_gemini_call(&prompt).await?
        };

        Ok(response)
    }

    async fn call_gemini_api(&self, prompt: &str) -> Result<String, AgentError> {
        #[derive(Deserialize)]
        struct GeminiResponse {
            candidates: Vec<Candidate>,
        }

        #[derive(Deserialize)]
        struct Candidate {
            content: Content,
        }

        #[derive(Deserialize)]
        struct Content {
            parts: Vec<Part>,
        }

        #[derive(Deserialize)]
        struct Part {
            text: String,
        }

        let request_body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "topK": 40,
                "topP": 0.95
            }
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            "gemini-2.5-flash", self.api_key
        );

        let response = self.client.post(&url).json(&request_body).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AgentError::GeminiError(format!(
                "API call failed with status {}: {}",
                status, error_text
            )));
        }

        let gemini_response: GeminiResponse = response.json().await?;

        if let Some(candidate) = gemini_response.candidates.first() {
            if let Some(part) = candidate.content.parts.first() {
                return Ok(part.text.clone());
            }
        }

        Err(AgentError::GeminiError("No valid response from Gemini API".to_string()))
    }

    async fn mock_gemini_call(&self, prompt: &str) -> Result<String, AgentError> {
        // Mock implementation for testing
        let prompt_lower = prompt.to_lowercase();

        if prompt_lower.contains("你好") || prompt_lower.contains("hello") {
            Ok("你好！我是Fleet Assistant，可以帮助你创建各种用户界面。你需要显示什么信息吗？".to_string())
        } else if prompt_lower.contains("联系人") {
            Ok("我可以为你创建一个联系人列表界面。让我为你生成一个美观的联系人展示界面。".to_string())
        } else if prompt_lower.contains("数据") || prompt_lower.contains("信息") {
            Ok("我理解你想要展示一些数据。让我为你创建一个合适的数据展示界面。".to_string())
        } else {
            Ok("我理解了你的需求。让我为你创建一个合适的界面来展示相关信息。".to_string())
        }
    }

    fn analyze_ui_suggestion(&self, content: &str) -> Option<String> {
        let content_lower = content.to_lowercase();

        if content_lower.contains("联系") || content_lower.contains("contact") {
            Some("contact_list".to_string())
        } else if content_lower.contains("搜索") || content_lower.contains("search") {
            Some("search".to_string())
        } else if content_lower.contains("表单") || content_lower.contains("form") {
            Some("form".to_string())
        } else if content_lower.contains("列表") || content_lower.contains("list") {
            Some("list".to_string())
        } else if content_lower.contains("卡片") || content_lower.contains("card") {
            Some("card".to_string())
        } else {
            None
        }
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), AgentError> {
        let mut sessions = self.sessions.write().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| AgentError::SessionNotFound(session_id.to_string()))?;
        Ok(())
    }

    pub async fn list_sessions(&self) -> Result<Vec<String>, AgentError> {
        let sessions = self.sessions.read().await;
        Ok(sessions.keys().cloned().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_session() {
        let agent = GeminiAgent::new("test-api-key".to_string()).unwrap();
        let session_id = agent.create_session(None).await.unwrap();
        assert!(!session_id.is_empty());
    }

    #[tokio::test]
    async fn test_send_message() {
        let agent = GeminiAgent::new("test-api-key".to_string()).unwrap();
        let session_id = agent.create_session(None).await.unwrap();
        let response = agent.send_message(&session_id, "你好".to_string()).await.unwrap();
        assert!(!response.is_empty());
    }

    #[tokio::test]
    async fn test_contact_ui_generation() {
        let agent = GeminiAgent::new("test-api-key".to_string()).unwrap();
        let session_id = agent.create_session(None).await.unwrap();
        let response = agent
            .send_message(&session_id, "显示联系人列表".to_string())
            .await
            .unwrap();
        assert!(!response.is_empty());

        // Should generate BeginRendering message
        match &response[0] {
            A2UIMessage::BeginRendering(_) => {}
            _ => panic!("Expected BeginRendering message"),
        }
    }
}
