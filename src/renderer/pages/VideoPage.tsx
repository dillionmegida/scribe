import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Project, Segment } from '../../renderer/types';

// ── Animations ────────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); }`;
const spin = keyframes`to { transform: rotate(360deg); }`;

// ── Layout ────────────────────────────────────────────────────────────────────

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${p => p.theme.bg};
  animation: ${fadeIn} 0.25s ease;
`;

const TitleBar = styled.div`
  height: 52px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding: 0 20px 0 80px;
  border-bottom: 1px solid ${p => p.theme.border};
  flex-shrink: 0;
  gap: 12px;
`;

const BackBtn = styled.button`
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${p => p.theme.textMuted};
  padding: 4px 8px;
  border-radius: ${p => p.theme.radiusSm};
  transition: color 0.15s, background 0.15s;

  &:hover { color: ${p => p.theme.text}; background: ${p => p.theme.surfaceHover}; }
`;

const TitleText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

// ── Left: Video ───────────────────────────────────────────────────────────────

const VideoPane = styled.div`
  width: 55%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${p => p.theme.border};
  overflow: hidden;
`;

const VideoWrap = styled.div`
  flex: 1;
  background: #000;
  display: flex;
  /* align-items: center; */
  justify-content: center;
  overflow: hidden;
`;

const Video = styled.video`
  max-width: 100%;
  max-height: 100%;
  display: block;
`;

// ── Right: Transcription ──────────────────────────────────────────────────────

const TranscriptPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PaneHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${p => p.theme.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const PaneTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${p => p.theme.textMuted};
`;

const CopyGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const CopyBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 11px;
  border-radius: ${p => p.theme.radiusSm};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  border: 1px solid ${p => p.$active ? p.theme.accent : p.theme.border};
  color: ${p => p.$active ? p.theme.accentText : p.theme.textMuted};
  background: ${p => p.$active ? p.theme.accent : 'transparent'};
  transition: all 0.15s;
  cursor: pointer;

  &:hover {
    border-color: ${p => p.theme.accent};
    color: ${p => p.$active ? p.theme.accentText : p.theme.accent};
  }
`;

const SegmentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
`;

const SegmentRow = styled.div<{ $active?: boolean }>`
  padding: 10px 20px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  cursor: pointer;
  transition: background 0.12s;
  background: ${p => p.$active ? p.theme.accentDim : 'transparent'};
  border-left: 2px solid ${p => p.$active ? p.theme.accent : 'transparent'};

  &:hover { background: ${p => p.$active ? p.theme.accentDim : p.theme.surface}; }
`;

const Timestamp = styled.span`
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: ${p => p.theme.textDim};
  padding-top: 1px;
  flex-shrink: 0;
  min-width: 44px;
`;

const SegText = styled.span`
  font-size: 13.5px;
  line-height: 1.65;
  color: ${p => p.theme.text};
  user-select: text;
`;

// ── States ────────────────────────────────────────────────────────────────────

const Center = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: ${p => p.theme.textMuted};
  user-select: none;
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 2px solid ${p => p.theme.border};
  border-top-color: ${p => p.theme.accent};
  border-radius: 50%;
  animation: ${spin} 0.75s linear infinite;
`;

const TranscribeBtn = styled.button`
  padding: 10px 22px;
  border-radius: ${p => p.theme.radiusSm};
  background: ${p => p.theme.accent};
  color: ${p => p.theme.accentText};
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.15s, transform 0.15s;

  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &:active { transform: none; }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

const ErrorMsg = styled.div`
  font-size: 12px;
  color: ${p => p.theme.red};
  background: rgba(255,95,95,0.08);
  border: 1px solid rgba(255,95,95,0.2);
  border-radius: ${p => p.theme.radiusSm};
  padding: 10px 16px;
  max-width: 340px;
  text-align: center;
  line-height: 1.5;
  font-family: 'DM Mono', monospace;
  white-space: pre-wrap;
`;

const CopiedToast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(${p => p.$visible ? '0' : '8px'});
  opacity: ${p => p.$visible ? 1 : 0};
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  color: ${p => p.theme.text};
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  pointer-events: none;
  z-index: 100;
`;

// ── Utils ─────────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    window.api.getProject(videoId!).then(p => { if (p) setProject(p); });
    const unsub = window.api.onTranscribeProgress(data => {
      if (data.projectId === videoId) {
        setProgressMsg(data.step);
        if (typeof data.percent === 'number') setProgressPercent(data.percent);
      }
    });
    return unsub;
  }, [videoId]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  function activeSegmentIndex(segs: Segment[]) {
    for (let i = segs.length - 1; i >= 0; i--) {
      if (currentTime >= segs[i].start) return i;
    }
    return -1;
  }

  async function handleTranscribe() {
    if (!project) return;
    setTranscribing(true);
    setError('');
    setProgressMsg('Preparing…');
    setProgressPercent(0);
    try {
      const updated = await window.api.transcribe(project.id);
      setProject(updated);
    } catch (e: any) {
      setError(e.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
      setProgressMsg('');
      setProgressPercent(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  function copyWithTimestamps() {
    if (!project?.transcription) return;
    const text = project.transcription
      .map(s => `[${formatTime(s.start)}] ${s.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied with timestamps');
  }

  function copyPlain() {
    if (!project?.transcription) return;
    const text = project.transcription.map(s => s.text).join(' ');
    navigator.clipboard.writeText(text);
    showToast('Copied as plain text');
  }

  function seekTo(start: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.play();
    }
  }

  if (!project) return null;

  const activeIdx = project.transcription ? activeSegmentIndex(project.transcription) : -1;

  return (
    <Shell>
      <TitleBar>
        <BackBtn onClick={() => navigate('/')}>← Back</BackBtn>
        <TitleText>{project.name}</TitleText>
      </TitleBar>

      <Body>
        {/* ── Video ── */}
        <VideoPane>
          <VideoWrap>
            <Video
              ref={videoRef}
              src={`file://${project.file_path}`}
              controls
              onTimeUpdate={handleTimeUpdate}
            />
          </VideoWrap>
        </VideoPane>

        {/* ── Transcript ── */}
        <TranscriptPane>
          {project.status === 'done' && project.transcription ? (
            <>
              <PaneHeader>
                <PaneTitle>Transcription</PaneTitle>
                <CopyGroup>
                  <CopyBtn onClick={copyPlain}>Copy text</CopyBtn>
                  <CopyBtn onClick={copyWithTimestamps} $active>Copy with timestamps</CopyBtn>
                </CopyGroup>
              </PaneHeader>
              <SegmentList>
                {project.transcription.map((seg, i) => (
                  <SegmentRow
                    key={i}
                    $active={i === activeIdx}
                    onClick={() => seekTo(seg.start)}
                  >
                    <Timestamp>{formatTime(seg.start)}</Timestamp>
                    <SegText>{seg.text}</SegText>
                  </SegmentRow>
                ))}
              </SegmentList>
            </>
          ) : transcribing ? (
            <Center>
              <Spinner />
              {progressPercent !== null && (
                <div style={{ fontSize: 26, fontWeight: 700, color: '#c8f060' }}>
                  {progressPercent}%
                </div>
              )}
              <span style={{ textAlign: 'center', maxWidth: 320, color: '#d0d0d0' }}>
                {progressMsg || 'Working…'}
              </span>
            </Center>
          ) : (
            <Center>
              <div style={{ fontSize: 32, marginBottom: 4 }}>🎙</div>
              <strong style={{ fontSize: 15 }}>No transcription yet</strong>
              <span style={{ fontSize: 13, marginBottom: 12 }}>
                Uses whisper — runs locally, fully private
              </span>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <TranscribeBtn onClick={handleTranscribe} disabled={transcribing}>
                Transcribe Video
              </TranscribeBtn>
            </Center>
          )}
        </TranscriptPane>
      </Body>

      <CopiedToast $visible={toastVisible}>{toast}</CopiedToast>
    </Shell>
  );
}