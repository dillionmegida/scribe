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
  showInFinder: (filePath: string) => ipcRenderer.invoke('show-in-finder', filePath),
  onTranscribeProgress: (cb: (data: any) => void) => {
    ipcRenderer.on('transcribe-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('transcribe-progress');
  },
});