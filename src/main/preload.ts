import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id: string) => ipcRenderer.invoke('get-project', id),
  importVideo: () => ipcRenderer.invoke('import-video'),
  importVideoPath: (filePath: string) => ipcRenderer.invoke('import-video-path', filePath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  transcribe: (id: string) => ipcRenderer.invoke('transcribe', id),
  renameProject: (id: string, name: string) => ipcRenderer.invoke('rename-project', id, name),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  saveTranscription: (id: string, segments: Array<{ start: number; end: number; text: string }>) => ipcRenderer.invoke('save-transcription', id, segments),
  showInFinder: (filePath: string) => ipcRenderer.invoke('show-in-finder', filePath),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('check-file-exists', filePath),
  setVideoMeta: (id: string) => ipcRenderer.invoke('set-video-meta', id),
  onTranscribeProgress: (cb: (data: any) => void) => {
    ipcRenderer.on('transcribe-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('transcribe-progress');
  },
});