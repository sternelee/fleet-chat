use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Include the A2UI schema as a static string
pub const A2UI_SCHEMA_JSON: &str = include_str!("schema.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Styles {
    pub font: Option<String>,
    pub primary_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeginRendering {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub root: String,
    pub styles: Option<Styles>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceUpdate {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub components: Vec<UIComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataModelUpdate {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
    pub path: Option<String>,
    pub contents: Vec<DataContent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteSurface {
    #[serde(rename = "surfaceId")]
    pub surface_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "t", content = "c")]
pub enum UIComponentType {
    #[serde(rename = "Text")]
    Text {
        #[serde(rename = "text")]
        text: TextValue,
        #[serde(rename = "usageHint")]
        usage_hint: Option<String>,
    },
    #[serde(rename = "Button")]
    Button {
        child: String,
        #[serde(rename = "primary")]
        primary: Option<bool>,
        #[serde(rename = "secondary")]
        secondary: Option<bool>,
        action: Option<Action>,
    },
    #[serde(rename = "Row")]
    Row {
        alignment: Option<String>,
        distribution: Option<String>,
        children: Children,
    },
    #[serde(rename = "Column")]
    Column {
        alignment: Option<String>,
        distribution: Option<String>,
        children: Children,
    },
    #[serde(rename = "List")]
    List {
        children: Children,
        direction: Option<String>,
        alignment: Option<String>,
    },
    #[serde(rename = "Card")]
    Card { child: String },
    #[serde(rename = "TextField")]
    TextField {
        label: TextValue,
        value: Option<TextValue>,
        #[serde(rename = "type")]
        field_type: Option<String>,
        action: Option<Action>,
    },
    #[serde(rename = "Tabs")]
    Tabs {
        #[serde(rename = "tabItems")]
        tab_items: Vec<TabItem>,
        #[serde(rename = "selectedTabBinding")]
        selected_tab_binding: Option<String>,
    },
    #[serde(rename = "Icon")]
    Icon {
        #[serde(rename = "iconType")]
        icon_type: Option<String>,
    },
    #[serde(rename = "Divider")]
    Divider { orientation: Option<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIComponent {
    pub id: String,
    pub component: UIComponentType,
    pub weight: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextValue {
    #[serde(rename = "literalString")]
    pub literal_string: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub name: String,
    pub context: Vec<ActionContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionContext {
    pub key: String,
    pub value: ActionValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionValue {
    #[serde(rename = "path")]
    Path(String),
    #[serde(rename = "literalString")]
    LiteralString(String),
    #[serde(rename = "literalNumber")]
    LiteralNumber(f64),
    #[serde(rename = "literalBoolean")]
    LiteralBoolean(bool),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Children {
    #[serde(rename = "explicitList")]
    pub explicit_list: Option<Vec<String>>,
    pub template: Option<Template>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    #[serde(rename = "componentId")]
    pub component_id: String,
    #[serde(rename = "dataBinding")]
    pub data_binding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabItem {
    pub title: TextValue,
    pub child: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataContent {
    pub key: String,
    #[serde(rename = "valueMap")]
    pub value_map: Option<Vec<ValueMapEntry>>,
    #[serde(rename = "valueString")]
    pub value_string: Option<String>,
    #[serde(rename = "valueNumber")]
    pub value_number: Option<f64>,
    #[serde(rename = "valueBoolean")]
    pub value_boolean: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueMapEntry {
    pub key: String,
    #[serde(rename = "valueString")]
    pub value_string: Option<String>,
    #[serde(rename = "valueNumber")]
    pub value_number: Option<f64>,
    #[serde(rename = "valueBoolean")]
    pub value_boolean: Option<bool>,
    #[serde(rename = "valueMap")]
    pub value_map: Option<Vec<ValueMapEntry>>,
}

