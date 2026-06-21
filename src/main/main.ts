import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import Database from './database';

// Ensure ffmpeg/ffprobe are findable in packaged app (macOS .app has minimal PATH)
const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];
process.env.PATH = [process.env.PATH, ...extraPaths].join(':');

let mainWindow: BrowserWindow | null = null;
const db = new Database();

function getThumbnailsDir(): string {
  const dir = path.join(app.getPath('userData'), 'thumbnails');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getWindowBoundsPath() {
  return path.join(app.getPath('userData'), 'window-bounds.json');
}

function loadWindowBounds(): { width: number; height: number; x?: number; y?: number } {
  try {
    const raw = fs.readFileSync(getWindowBoundsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { width: 1200, height: 780 };
  }
}

function saveWindowBounds() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  fs.writeFileSync(getWindowBoundsPath(), JSON.stringify(bounds));
}

function createWindow() {
  const bounds = loadWindowBounds();

  mainWindow = new BrowserWindow({
    ...bounds,
    show: false,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 17 },
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for File.path on drag-and-drop in dev mode
      webSecurity: false, // allow file:// video src
    },
  });

  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  if (process.env.NODE_ENV === 'development') {
    mainWindow?.webContents.openDevTools();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Projects ──────────────────────────────────────────────────────────────────

ipcMain.handle('get-projects', () => db.getProjectsLight());
ipcMain.handle('get-project', (_e, id: string) => db.getProject(id));
ipcMain.handle('rename-project', (_e, id: string, name: string) => { db.renameProject(id, name); return true; });
ipcMain.handle('delete-project', (_e, id: string) => { db.deleteProject(id); return true; });

// ── Import video ──────────────────────────────────────────────────────────────

async function extractVideoMeta(filePath: string, thumbDestPath?: string): Promise<{ aspectRatio: string; thumbnailPath: string | null }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-meta-'));
  let aspectRatio = '16/9';
  let thumbnailPath: string | null = null;

  try {
    // Probe for dimensions
    const probeOut = await new Promise<string>((resolve, reject) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        filePath,
      ]);
      let out = '';
      proc.stdout.on('data', d => { out += d.toString(); });
      proc.on('close', code => code === 0 ? resolve(out.trim()) : reject());
    });
    const [w, h] = probeOut.split(',').map(Number);
    if (w && h) aspectRatio = `${w}/${h}`;
  } catch {}

  try {
    // Extract thumbnail directly to destination (or tmp if no dest provided)
    const destPath = thumbDestPath ?? path.join(tmpDir, 'thumb.jpg');
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-i', filePath,
        '-ss', '00:00:02',
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-q:v', '5',
        '-y', destPath,
      ]);
      proc.on('close', code => code === 0 ? resolve() : reject());
    });
    if (thumbDestPath) thumbnailPath = thumbDestPath;
  } catch {}

  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { aspectRatio, thumbnailPath };
}

ipcMain.handle('import-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select a video file',
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const name = path.basename(filePath, path.extname(filePath));
  const projectId = uuidv4();
  const thumbPath = path.join(getThumbnailsDir(), `${projectId}.jpg`);
  const { aspectRatio, thumbnailPath } = await extractVideoMeta(filePath, thumbPath);
  return db.createProject(name, filePath, aspectRatio, thumbnailPath ?? undefined, projectId);
});

ipcMain.handle('import-video-path', async (_e, filePath: string) => {
  const name = path.basename(filePath, path.extname(filePath));
  const projectId = uuidv4();
  const thumbPath = path.join(getThumbnailsDir(), `${projectId}.jpg`);
  const { aspectRatio, thumbnailPath } = await extractVideoMeta(filePath, thumbPath);
  return db.createProject(name, filePath, aspectRatio, thumbnailPath ?? undefined, projectId);
});

ipcMain.handle('import-video-buffer', async (_e, name: string, buffer: ArrayBuffer) => {
  const videosDir = path.join(app.getPath('userData'), 'videos');
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  const ext = path.extname(name);
  const baseName = path.basename(name, ext);
  const destPath = path.join(videosDir, name);
  fs.writeFileSync(destPath, Buffer.from(buffer));
  const projectId = uuidv4();
  const thumbPath = path.join(getThumbnailsDir(), `${projectId}.jpg`);
  const { aspectRatio, thumbnailPath } = await extractVideoMeta(destPath, thumbPath);
  return db.createProject(baseName, destPath, aspectRatio, thumbnailPath ?? undefined, projectId);
});

ipcMain.handle('set-video-meta', async (_e, id: string) => {
  const project = db.getProject(id);
  if (!project) return false;
  const thumbPath = path.join(getThumbnailsDir(), `${id}.jpg`);
  const { aspectRatio, thumbnailPath } = await extractVideoMeta(project.file_path, thumbPath);
  db.setVideoMeta(id, aspectRatio, thumbnailPath);
  return db.getProject(id);
});

// ── Transcribe ────────────────────────────────────────────────────────────────

ipcMain.handle('transcribe', async (event, projectId: string) => {
  const project = db.getProject(projectId);
  if (!project) throw new Error('Project not found');

  db.setStatus(projectId, 'transcribing');

  let lastProgress = '';
  let lastPercent: number | null = null;
  const sendProgress = (step: string, percent?: number) => {
    const trimmed = step.trim();
    const boundedPct = typeof percent === 'number'
      ? Math.max(0, Math.min(100, Math.floor(percent)))
      : undefined;

    const pctChanged = boundedPct !== undefined && boundedPct !== lastPercent;
    const textChanged = !!trimmed && trimmed !== lastProgress;

    if (!pctChanged && !textChanged) return;

    if (textChanged) lastProgress = trimmed;
    if (pctChanged) lastPercent = boundedPct!;

    event.sender.send('transcribe-progress', {
      projectId,
      step: trimmed || lastProgress,
      percent: boundedPct,
    });
  };

  // Resolve whisper binary
  const whisperCandidates = [
    '/opt/homebrew/bin/whisper-cli',
    '/usr/local/bin/whisper-cli',
    '/opt/homebrew/bin/whisper',
    '/usr/local/bin/whisper',
    '/opt/homebrew/bin/whisper-cpp',
    '/usr/local/bin/whisper-cpp',
    path.join(os.homedir(), 'whisper.cpp/build/bin/whisper-cli'),
    path.join(os.homedir(), 'whisper.cpp/build/bin/main'),
    path.join(os.homedir(), 'whisper.cpp/main'),
    path.join(os.homedir(), '.local/bin/whisper'),
  ];

  let whisperBin: string | null = null;
  for (const p of whisperCandidates) {
    if (fs.existsSync(p)) { whisperBin = p; break; }
  }
  if (!whisperBin) {
    try { whisperBin = execSync('which whisper', { encoding: 'utf-8' }).trim(); } catch {}
  }
  if (!whisperBin) {
    try { whisperBin = execSync('which whisper-cpp', { encoding: 'utf-8' }).trim(); } catch {}
  }
  if (!whisperBin) {
    db.setStatus(projectId, 'error');
    throw new Error(
      'whisper not found.\n\nInstall with:\n  brew install whisper-cpp\nor:\n  pip install openai-whisper'
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-'));

  try {
    // Convert to 16kHz mono WAV
    sendProgress('Preparing audio…', 1);
    const wavPath = path.join(tmpDir, 'audio.wav');

    let audioDuration = 0;
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-i', project.file_path,
        '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
        '-y', wavPath,
      ]);
      let errOut = '';
      proc.stderr.on('data', d => {
        const text = d.toString();
        errOut += text;
        
        // Extract duration from ffmpeg output
        const durationMatch = text.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          audioDuration = hours * 3600 + minutes * 60 + seconds;
        }
        
        const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch && audioDuration > 0) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const pct = Math.min(5, (currentTime / audioDuration) * 5);
          sendProgress('Preparing audio…', pct);
        }
      });
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${errOut.slice(-200)}`)));
    });

    sendProgress('Transcribing…', 5);

    const segments: Array<{ start: number; end: number; text: string }> = [];
    const isOpenAIWhisper = whisperBin.endsWith('whisper') && !whisperBin.includes('whisper-cpp') && !whisperBin.includes('whisper.cpp');

    if (isOpenAIWhisper) {
      // openai-whisper Python CLI
      const startTime = Date.now();
      // Use audio duration if available, otherwise assume 60 seconds minimum
      const baseDuration = audioDuration > 0 ? audioDuration : 60;
      const estimatedDuration = Math.max(10, baseDuration * 0.3); // whisper typically takes ~30% of audio duration, min 10s
      
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedPct = Math.min(95, 5 + (elapsed / estimatedDuration) * 90);
        sendProgress('Transcribing…', estimatedPct);
      }, 500);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(whisperBin!, [
          wavPath, '--model', 'base',
          '--output_format', 'json',
          '--output_dir', tmpDir,
          '--verbose', 'False',
        ]);
        let errOut = '';
        proc.stderr.on('data', d => {
          errOut += d.toString();
        });
        proc.on('close', code => {
          clearInterval(progressInterval);
          code === 0 ? resolve() : reject(new Error(`whisper failed: ${errOut.slice(-300)}`));
        });
      });

      sendProgress('Finishing…', 98);
      const jsonPath = path.join(tmpDir, 'audio.json');
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      for (const seg of raw.segments ?? []) {
        segments.push({ start: seg.start, end: seg.end, text: (seg.text as string).trim() });
      }
    } else {
      // whisper.cpp binary
      const modelCandidates = [
        path.join(__dirname, '../../../whisper-cpp/models/ggml-base.en.bin'),
        path.join(__dirname, '../../../whisper-models/ggml-base.bin'),
        path.join(os.homedir(), 'whisper.cpp/models/ggml-base.en.bin'),
        path.join(os.homedir(), 'whisper.cpp/models/ggml-base.bin'),
        path.join(os.homedir(), 'Documents/github/whisper.cpp/models/ggml-base.en.bin'),
        path.join(os.homedir(), 'Documents/github/whisper.cpp/models/ggml-base.bin'),
        path.join(os.homedir(), 'Desktop/github/whisper.cpp/models/ggml-base.en.bin'),
        path.join(os.homedir(), 'Desktop/github/whisper.cpp/models/ggml-base.bin'),
        path.join(os.homedir(), 'Desktop/github/whisper-models/ggml-base.en.bin'),
        path.join(os.homedir(), 'Desktop/github/whisper-models/ggml-base.bin'),
        path.join(os.homedir(), '.cache/whisper/ggml-base.en.bin'),
        path.join(os.homedir(), '.cache/whisper/ggml-base.bin'),
        '/opt/homebrew/share/whisper-cpp/models/ggml-base.en.bin',
        '/opt/homebrew/share/whisper-cpp/models/ggml-base.bin',
        '/opt/homebrew/share/whisper-cpp/ggml-base.en.bin',
        '/opt/homebrew/share/whisper-cpp/ggml-base.bin',
        '/usr/local/share/whisper-cpp/models/ggml-base.en.bin',
        '/usr/local/share/whisper-cpp/models/ggml-base.bin',
        '/usr/local/share/whisper-cpp/ggml-base.en.bin',
        '/usr/local/share/whisper-cpp/ggml-base.bin',
      ];
      let model = modelCandidates.find(p => fs.existsSync(p)) ?? null;

      if (!model) {
        try {
          const searchDirs = [
            os.homedir(),
            '/opt/homebrew/share',
            '/usr/local/share',
          ].join(' ');
          const found = execSync(
            `find ${searchDirs} -name "ggml-base*.bin" -maxdepth 8 2>/dev/null | head -1`,
            { encoding: 'utf-8', timeout: 8000 }
          ).trim();
          if (found && fs.existsSync(found)) model = found;
        } catch {}
      }

      if (!model) {
        db.setStatus(projectId, 'error');
        throw new Error(
          'whisper.cpp model not found.\n\nDownload with:\n  cd ~/whisper.cpp && bash models/download-ggml-model.sh base.en'
        );
      }

      const outBase = path.join(tmpDir, 'out');
      
      const startTime = Date.now();
      // Use audio duration if available, otherwise assume 60 seconds minimum
      const baseDuration = audioDuration > 0 ? audioDuration : 60;
      const estimatedDuration = Math.max(5, baseDuration * 0.15); // whisper.cpp typically takes ~15% of audio duration, min 5s
      
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedPct = Math.min(95, 5 + (elapsed / estimatedDuration) * 90);
        sendProgress('Transcribing…', estimatedPct);
      }, 500);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(whisperBin!, [
          '-f', wavPath, '-m', model,
          '--output-json', '--output-file', outBase,
        ]);
        let errOut = '';
        proc.stderr.on('data', d => {
          errOut += d.toString();
        });
        proc.on('close', code => {
          clearInterval(progressInterval);
          code === 0 ? resolve() : reject(new Error(`whisper.cpp failed: ${errOut.slice(-300)}`));
        });
      });

      sendProgress('Finishing…', 98);
      const raw = JSON.parse(fs.readFileSync(outBase + '.json', 'utf-8'));
      const items = raw.transcription ?? raw.segments ?? [];
      for (const seg of items) {
        const offsets = seg.offsets ?? {};
        const start = typeof offsets.from === 'number' ? offsets.from / 1000 : 0;
        const end = typeof offsets.to === 'number' ? offsets.to / 1000 : 0;
        const text = (seg.text as string ?? '').trim();
        if (text) segments.push({ start, end, text });
      }
    }

    sendProgress('Saving…', 100);
    db.saveTranscription(projectId, segments);
    return db.getProject(projectId);

  } catch (err) {
    db.setStatus(projectId, 'error');
    throw err;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ── Save transcription edits ─────────────────────────────────────────────────

ipcMain.handle('save-transcription', (_e, id: string, segments: Array<{ start: number; end: number; text: string }>) => {
  db.saveTranscription(id, segments);
  return true;
});

// ── Misc ──────────────────────────────────────────────────────────────────────

ipcMain.handle('show-in-finder', (_e, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('check-file-exists', (_e, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('check-files-exist', (_e, filePaths: string[]) => {
  const result: Record<string, boolean> = {};
  for (const fp of filePaths) result[fp] = fs.existsSync(fp);
  return result;
});

ipcMain.handle('get-video-thumbnail', async (_e, filePath: string) => {
  if (!fs.existsSync(filePath)) return null;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribe-thumb-'));
  const thumbPath = path.join(tmpDir, 'thumb.jpg');
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-i', filePath,
        '-ss', '00:00:02',
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-q:v', '5',
        '-y', thumbPath,
      ]);
      proc.on('close', code => code === 0 ? resolve() : reject());
    });
    const data = fs.readFileSync(thumbPath);
    return 'data:image/jpeg;base64,' + data.toString('base64');
  } catch {
    return null;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});