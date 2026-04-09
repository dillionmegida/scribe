import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id: string) => ipcRenderer.invoke('get-project', id),
  importVideo: () => ipcRenderer.invoke('import-video'),
  transcribe: (id: string) => ipcRenderer.invoke('transcribe', id),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  showInFinder: (filePath: string) => ipcRenderer.invoke('show-in-finder', filePath),
  onTranscribeProgress: (cb: (data: any) => void) => {
    ipcRenderer.on('transcribe-progress', (_e, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('transcribe-progress');
  },
});