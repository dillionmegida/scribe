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

declare global {
  interface Window {
    api: {
      getProjects: () => Promise<Project[]>;
      getProject: (id: string) => Promise<Project | null>;
      importVideo: () => Promise<Project | null>;
      importVideoPath: (filePath: string) => Promise<Project | null>;
      getPathForFile: (file: File) => string;
      transcribe: (id: string) => Promise<Project>;
      renameProject: (id: string, name: string) => Promise<boolean>;
      deleteProject: (id: string) => Promise<boolean>;
      showInFinder: (filePath: string) => Promise<void>;
      onTranscribeProgress: (cb: (data: { projectId: string; step: string; percent?: number }) => void) => () => void;
    };
  }
}