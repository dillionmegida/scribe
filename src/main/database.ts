import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  file_path: string;
  created_at: number;
  transcription: Segment[] | null;
  status: 'pending' | 'transcribing' | 'done' | 'error';
}

interface DbData {
  projects: Project[];
}

export default class Database {
  private dbPath: string;
  private data: DbData;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'scribe-db.json');

    if (fs.existsSync(this.dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
      } catch {
        this.data = { projects: [] };
      }
    } else {
      this.data = { projects: [] };
      this.save();
    }
  }

  private save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  getProjects(): Project[] {
    return [...this.data.projects].sort((a, b) => b.created_at - a.created_at);
  }

  getProject(id: string): Project | null {
    return this.data.projects.find(p => p.id === id) ?? null;
  }

  createProject(name: string, filePath: string): Project {
    const project: Project = {
      id: uuidv4(),
      name,
      file_path: filePath,
      created_at: Date.now(),
      transcription: null,
      status: 'pending',
    };
    this.data.projects.push(project);
    this.save();
    return project;
  }

  saveTranscription(id: string, segments: Segment[]) {
    const p = this.data.projects.find(x => x.id === id);
    if (p) {
      p.transcription = segments;
      p.status = 'done';
      this.save();
    }
  }

  setStatus(id: string, status: Project['status']) {
    const p = this.data.projects.find(x => x.id === id);
    if (p) { p.status = status; this.save(); }
  }

  deleteProject(id: string) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.save();
  }
}