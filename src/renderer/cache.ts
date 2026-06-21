import { Project } from './types';

const PROJECTS_KEY = 'scribe_projects_cache';

export function getCachedProjects(): Project[] | null {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedProjects(projects: Project[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {}
}

// Thumbnails are now file-path strings stored directly on the project.
// These stubs keep existing call-sites compiling during the transition.
export function getCachedThumbnails(): Record<string, string> {
  return {};
}

export function setCachedThumbnail(_id: string, _thumb: string) {}
