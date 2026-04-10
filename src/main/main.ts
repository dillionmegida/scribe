import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, execSync } from 'child_process';
import Database from './database';

let mainWindow: BrowserWindow | null = null;
const db = new Database();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow file:// video src
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  mainWindow?.webContents.openDevTools();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Projects ──────────────────────────────────────────────────────────────────

ipcMain.handle('get-projects', () => db.getProjects());
ipcMain.handle('get-project', (_e, id: string) => db.getProject(id));
ipcMain.handle('delete-project', (_e, id: string) => { db.deleteProject(id); return true; });

// ── Import video ──────────────────────────────────────────────────────────────

ipcMain.handle('import-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select a video file',
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const name = path.basename(filePath, path.extname(filePath));
  return db.createProject(name, filePath);
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
        path.join(__dirname, '../../../whisper-models/ggml-base.en.bin'),
        path.join(__dirname, '../../../whisper-models/ggml-base.bin'),
        path.join(os.homedir(), 'whisper.cpp/models/ggml-base.en.bin'),
        path.join(os.homedir(), 'whisper.cpp/models/ggml-base.bin'),
        '/opt/homebrew/share/whisper-cpp/ggml-base.en.bin',
        '/usr/local/share/whisper-cpp/ggml-base.en.bin',
        '/opt/homebrew/share/whisper-cpp/ggml-base.bin',
        '/usr/local/share/whisper-cpp/ggml-base.bin',
      ];
      const model = modelCandidates.find(fs.existsSync);
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

// ── Misc ──────────────────────────────────────────────────────────────────────

ipcMain.handle('show-in-finder', (_e, filePath: string) => {
  shell.showItemInFolder(filePath);
});