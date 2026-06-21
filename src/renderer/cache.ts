import { Project } from './types';

const PROJECTS_KEY = 'scribe_projects_cache';
const THUMBS_KEY = 'scribe_thumbs_cache';

export function getCachedProjects(): Project[] | null {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return null;
    const projects: Project[] = JSON.parse(raw);
    // Merge thumbnails back in from separate cache
    const thumbs = getCachedThumbnails();
    return projects.map(p => ({ ...p, thumbnail: thumbs[p.id] || p.thumbnail }));
  } catch {
    return null;
  }
}

export function setCachedProjects(projects: Project[]) {
  try {
    // Store thumbnails separately so the project list stays tiny
    const thumbs = getCachedThumbnails();
    for (const p of projects) {
      if (p.thumbnail) thumbs[p.id] = p.thumbnail;
    }
    localStorage.setItem(THUMBS_KEY, JSON.stringify(thumbs));
    // Store projects without thumbnails (fast to parse)
    const light = projects.map(({ thumbnail, ...rest }) => rest);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(light));
  } catch {}
}

export function getCachedThumbnails(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THUMBS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCachedThumbnail(id: string, thumb: string) {
  try {
    const thumbs = getCachedThumbnails();
    thumbs[id] = thumb;
    localStorage.setItem(THUMBS_KEY, JSON.stringify(thumbs));
  } catch {}
}
