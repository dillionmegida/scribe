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
  aspect_ratio?: string;
  thumbnail?: string;
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
      saveTranscription: (id: string, segments: Array<{ start: number; end: number; text: string }>) => Promise<boolean>;
      showInFinder: (filePath: string) => Promise<void>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      checkFilesExist: (filePaths: string[]) => Promise<Record<string, boolean>>;
      setVideoMeta: (id: string) => Promise<Project | false>;
      onTranscribeProgress: (cb: (data: { projectId: string; step: string; percent?: number }) => void) => () => void;
    };
  }
}