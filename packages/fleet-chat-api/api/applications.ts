/**
 * Applications API
 *
 * Provides access to system applications and application management
 */

import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'

export interface Application {
  name: string
  path: string
  icon_path?: string
  icon_base64?: string
}

export interface FileMatch {
  path: string
  line_number?: number
  line_content?: string
  match_type: string // "name" or "content"
}

export interface SearchResult {
  applications: Application[]
  files: FileMatch[]
}

/**
 * Search for applications by query
 */
export async function searchApplications(query: string): Promise<Application[]> {
  try {
    const applications = await invoke<Application[]>('search_applications', { query })
    return applications
  } catch (error) {
    console.error('Failed to search applications:', error)
    return []
  }
}

/**
 * Search for files by name or content
 */
export async function searchFiles(
  query: string,
  options?: {
    searchPath?: string
    searchContent?: boolean
  },
): Promise<FileMatch[]> {
  try {
    const files = await invoke<FileMatch[]>('search_files', {
      query,
      search_path: options?.searchPath,
      search_content: options?.searchContent || false,
    })
    return files
  } catch (error) {
    console.error('Failed to search files:', error)
    return []
  }
}

/**
 * Combined search that returns both applications and files
 */
export async function unifiedSearch(
  query: string,
  options?: {
    searchPath?: string
    includeFiles?: boolean
  },
): Promise<SearchResult> {
  try {
    const result = await invoke<SearchResult>('unified_search', {
      query,
      search_path: options?.searchPath,
      include_files: options?.includeFiles !== false, // default to true
    })
    return result
  } catch (error) {
    console.error('Failed to perform unified search:', error)
    return {
      applications: [],
      files: [],
    }
  }
}

/**
 * Get all applications installed on the system
 */
export async function getApplications(): Promise<Application[]> {
  try {
    const applications = await invoke<Application[]>('get_applications')
    return applications
  } catch (error) {
    console.error('Failed to get applications:', error)
    return []
  }
}

/**
 * Get the current frontmost application
 */
export async function getFrontmostApplication(): Promise<Application | null> {
  try {
    const app = await invoke<Application | null>('get_frontmost_application')
    return app
  } catch (error) {
    console.error('Failed to get frontmost application:', error)
    return null
  }
}

/**
 * Get all currently running applications
 */
export async function getRunningApplications(): Promise<Application[]> {
  try {
    const applications = await invoke<Application[]>('get_running_applications')
    return applications
  } catch (error) {
    console.error('Failed to get running applications:', error)
    return []
  }
}

/**
 * Get the default application for a file extension
 */
export async function getDefaultApplication(extension: string): Promise<Application | null> {
  try {
    const app = await invoke<Application | null>('get_default_application', { extension })
    return app
  } catch (error) {
    console.error('Failed to get default application:', error)
    return null
  }
}

/**
 * Launch an application by path or Application object
 */
export async function launchApplication(app: Application | string): Promise<void> {
  try {
    const path = typeof app === 'string' ? app : app.path
    await openPath(path)
  } catch (error) {
    console.error('Failed to launch application:', error)
    throw error
  }
}
