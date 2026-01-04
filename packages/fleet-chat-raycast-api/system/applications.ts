/**
 * Raycast-Compatible Application APIs
 *
 * Provides getFrontmostApplication(), open() following Raycast's API
 */

import {
  getFrontmostApplication,
  getRunningApplications,
  searchApplications,
  openApplication,
  type Application,
} from '@fleet-chat/core-api/api/applications';

/**
 * Raycast-compatible Application APIs
 */
export const applications = {
  getFrontmostApplication,
  getRunningApplications,
  searchApplications,
};

/**
 * Open a URL or file
 */
export async function open(target: string): Promise<void> {
  // Use Opener for URLs
  if (target.startsWith('http://') || target.startsWith('https://')) {
    const { Opener } = await import('@fleet-chat/core-api/api/opener');
    return Opener.open(target);
  }

  // Use openApplication for files/apps
  return openApplication(target);
}

// Re-export types
export type { Application };
