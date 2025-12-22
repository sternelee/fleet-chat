/**
 * Fleet Chat Plugin System
 *
 * A Raycast-compatible plugin system built on Tauri + Lit web components
 * Inspired by Vicinae architecture but adapted for web environment
 *
 * This module now re-exports from the centralized API package to avoid duplication.
 */

// Re-export all types from the centralized API package
export * from "../../packages/fleet-chat-api/plugins/core/types.js";
