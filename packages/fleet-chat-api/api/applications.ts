/**
 * Applications API
 *
 * Provides access to system applications and application management
 */

import { invoke } from "@tauri-apps/api/core";

export interface Application {
  name: string;
  path: string;
  bundleId?: string;
  icon?: string;
}

export async function getApplications(): Promise<Application[]> {
  try {
    const applications = await invoke<Application[]>("get_applications");
    return applications;
  } catch (error) {
    console.error("Failed to get applications:", error);
    return [];
  }
}

export async function getFrontmostApplication(): Promise<Application | null> {
  try {
    const app = await invoke<Application | null>("get_frontmost_application");
    return app;
  } catch (error) {
    console.error("Failed to get frontmost application:", error);
    return null;
  }
}

export async function getDefaultApplication(extension: string): Promise<Application | null> {
  try {
    const app = await invoke<Application | null>("get_default_application", { extension });
    return app;
  } catch (error) {
    console.error("Failed to get default application:", error);
    return null;
  }
}

export async function launchApplication(app: Application | string): Promise<void> {
  try {
    const path = typeof app === "string" ? app : app.path;
    await invoke("launch_application", { path });
  } catch (error) {
    console.error("Failed to launch application:", error);
    throw error;
  }
}

