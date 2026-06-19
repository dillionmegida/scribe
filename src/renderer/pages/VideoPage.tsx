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
  background: ${p => p.theme.surface};
  flex-shrink: 0;
  gap: 12px;
`;

const AppName = styled.button`
  -webkit-app-region: no-drag;
  font-size: 12px;
  font-weight: 700;
  color: ${p => p.theme.accent};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
  padding: 4px 2px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.6; }
`;

const BreadcrumbSep = styled.span`
  font-size: 14px;
  color: ${p => p.theme.textDim};
  flex-shrink: 0;
  user-select: none;
`;

const TitleText = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.theme.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
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
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
`;

const Video = styled.video<{ $ratio?: string }>`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  ${p => p.$ratio && `aspect-ratio: ${p.$ratio};`}
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
    background: ${p => p.$active ? p.theme.accent : p.theme.accentDim};
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

const SegEditInput = styled.textarea`
  font-size: 13.5px;
  line-height: 1.65;
  color: ${p => p.theme.text};
  background: ${p => p.theme.accentDim};
  border: 1.5px solid ${p => p.theme.accent};
  border-radius: 6px;
  padding: 3px 7px;
  width: 100%;
  resize: none;
  outline: none;
  font-family: inherit;
  overflow: hidden;
  box-shadow: 0 0 0 3px ${p => p.theme.accentDim};
`;

const SearchBar = styled.div`
  padding: 10px 20px;
  border-bottom: 1px solid ${p => p.theme.border};
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 7px 12px;
  border-radius: ${p => p.theme.radiusSm};
  border: 1px solid ${p => p.theme.border};
  background: ${p => p.theme.bg};
  color: ${p => p.theme.text};
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: ${p => p.theme.accent}; }
  &::placeholder { color: ${p => p.theme.textDim}; }
`;

const SearchCount = styled.span`
  font-size: 11px;
  color: ${p => p.theme.textDim};
  margin-left: 8px;
`;

const HighlightedText = styled.mark`
  background: rgba(255, 200, 0, 0.35);
  color: inherit;
  border-radius: 2px;
`;

const MissingFileBanner = styled.div`
  background: rgba(239,68,68,0.08);
  border-bottom: 1px solid rgba(239,68,68,0.2);
  color: ${p => p.theme.red};
  font-size: 12px;
  padding: 8px 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
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
  background: ${p => p.theme.text};
  border: 1px solid transparent;
  color: ${p => p.theme.surface};
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
`;

const ProgressPercent = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: ${p => p.theme.accent};
`;

const ProgressMsg = styled.span`
  text-align: center;
  max-width: 320px;
  color: ${p => p.theme.text};
  font-size: 13px;
`;

const ProgressBar = styled.div<{ $percent: number }>`
  width: 200px;
  height: 4px;
  background: ${p => p.theme.border};
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: ${p => p.$percent}%;
    background: ${p => p.theme.accent};
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;

const EmptyIcon = styled.div`
  font-size: 32px;
  margin-bottom: 4px;
`;

const EmptyTitle = styled.strong`
  font-size: 15px;
  color: ${p => p.theme.text};
`;

const EmptySubtitle = styled.span`
  font-size: 13px;
  margin-bottom: 12px;
  color: ${p => p.theme.textMuted};
`;

// ── Utils ─────────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <HighlightedText key={i}>{part}</HighlightedText>
          : part
      )}
    </>
  );
}

export default function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSegRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fileMissing, setFileMissing] = useState(false);
  const isPaused = useRef(true);

  useEffect(() => {
    window.api.getProject(videoId!).then(async p => {
      if (!p) return;
      setProject(p);
      const exists = await window.api.checkFileExists(p.file_path);
      setFileMissing(!exists);
      if (exists && (!p.aspect_ratio || !p.thumbnail)) {
        const updated = await window.api.setVideoMeta(p.id);
        if (updated) setProject(updated as typeof p);
      }
    });
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

  useEffect(() => {
    if (activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentTime]);

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
      if (!isPaused.current) videoRef.current.play();
    }
  }

  function startEdit(e: React.MouseEvent, idx: number, text: string) {
    e.stopPropagation();
    setEditingIdx(idx);
    setEditValue(text);
  }

  async function commitEdit(idx: number) {
    if (!project?.transcription) return;
    const updated = project.transcription.map((s, i) =>
      i === idx ? { ...s, text: editValue.trim() || s.text } : s
    );
    await window.api.saveTranscription(project.id, updated);
    setProject(prev => prev ? { ...prev, transcription: updated } : prev);
    setEditingIdx(null);
  }

  function cancelEdit() {
    setEditingIdx(null);
    setEditValue('');
  }

  if (!project) return null;

  const segs = project.transcription ?? [];
  const filteredSegs = searchQuery.trim()
    ? segs.map((s, i) => ({ ...s, originalIdx: i })).filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segs.map((s, i) => ({ ...s, originalIdx: i }));

  const activeIdx = segs.length ? activeSegmentIndex(segs) : -1;

  return (
    <Shell>
      <TitleBar>
        <AppName onClick={() => navigate('/')}>Scribe</AppName>
        <BreadcrumbSep>›</BreadcrumbSep>
        <TitleText>{project.name}</TitleText>
      </TitleBar>

      <Body>
        {/* ── Video ── */}
        <VideoPane>
          {fileMissing && (
            <MissingFileBanner>
              ⚠ Video file not found at original path — playback unavailable
            </MissingFileBanner>
          )}
          <VideoWrap>
            <Video
              $ratio={project.aspect_ratio}
              ref={videoRef}
              src={fileMissing ? undefined : `file://${project.file_path}`}
              poster={project.thumbnail}
              controls
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => { isPaused.current = false; }}
              onPause={() => { isPaused.current = true; }}
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
              <SearchBar>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <SearchInput
                    placeholder="Search transcript…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery.trim() && (
                    <SearchCount>{filteredSegs.length} result{filteredSegs.length !== 1 ? 's' : ''}</SearchCount>
                  )}
                </div>
              </SearchBar>
              <SegmentList>
                {filteredSegs.map(seg => {
                  const i = seg.originalIdx;
                  const isActive = i === activeIdx;
                  const isEditing = editingIdx === i;
                  return (
                    <SegmentRow
                      key={i}
                      ref={isActive ? activeSegRef : null}
                      $active={isActive}
                      onClick={() => !isEditing && seekTo(seg.start)}
                      onDoubleClick={e => !isEditing && startEdit(e, i, seg.text)}
                      title="Double-click to edit"
                    >
                      <Timestamp>{formatTime(seg.start)}</Timestamp>
                      {isEditing ? (
                        <SegEditInput
                          autoFocus
                          value={editValue}
                          rows={Math.max(1, Math.ceil(editValue.length / 40))}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(i)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(i); }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <SegText>{highlightText(seg.text, searchQuery)}</SegText>
                      )}
                    </SegmentRow>
                  );
                })}
              </SegmentList>
            </>
          ) : transcribing ? (
            <Center>
              <Spinner />
              {progressPercent !== null && (
                <ProgressBar $percent={progressPercent} />
              )}
              {progressPercent !== null && (
                <ProgressPercent>{progressPercent}%</ProgressPercent>
              )}
              <ProgressMsg>{progressMsg || 'Working…'}</ProgressMsg>
            </Center>
          ) : (
            <Center>
              <EmptyIcon>🎙</EmptyIcon>
              <EmptyTitle>No transcription yet</EmptyTitle>
              <EmptySubtitle>Uses whisper — runs locally, fully private</EmptySubtitle>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <TranscribeBtn onClick={handleTranscribe} disabled={transcribing || fileMissing}>
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