/**
 * Applications API
 *
 * Tauri commands for application management using existing search.rs implementations
 */

import { invoke } from '@tauri-apps/api/core';

export interface Application {
  name: string;
  path: string;
  icon?: string;
}

/**
 * Get frontmost application
 */
export async function getFrontmostApplication(): Promise<Application | null> {
  return invoke<Application | null>('get_frontmost_application');
}

/**
 * Get all running applications
 */
export async function getRunningApplications(): Promise<Application[]> {
  return invoke<Application[]>('get_running_applications');
}

/**
 * Search applications by name
 */
export async function searchApplications(query: string): Promise<Application[]> {
  return invoke<Application[]>('search_applications', { query });
}

/**
 * Get all installed applications
 */
export async function getAllApplications(): Promise<Application[]> {
  return invoke<Application[]>('get_all_applications');
}

/**
 * Open application by path
 */
export async function openApplication(path: string): Promise<void> {
  // Use Shell.open from shell API
  const { Shell } = await import('./shell.js');
  await Shell.open(path);
}

/**
 * Get default application for file extension
 */
export async function getDefaultApplication(extension: string): Promise<Application | null> {
  return invoke<Application | null>('get_default_application', { extension });
}
