import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Project } from '../../renderer/types';
import { getCachedProjects, getCachedThumbnails, setCachedProjects, setCachedThumbnail } from '../cache';

function toDisplayUrl(thumbnail?: string): string | undefined {
  if (!thumbnail) return undefined;
  if (thumbnail.startsWith('data:') || thumbnail.startsWith('file://') || thumbnail.startsWith('http')) return thumbnail;
  return `file://${thumbnail}`;
}

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;

const Content = styled.div<{ $isDragging?: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  position: relative;
  
  ${p => p.$isDragging && `
    & > *:not([data-drop-overlay]) {
      filter: blur(3px);
      pointer-events: none;
      user-select: none;
    }
  `}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  animation: ${fadeIn} 0.3s ease;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 600;
  color: ${p => p.theme.text};
`;

const ImportBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 18px;
  min-width: 140px;
  background: ${p => p.theme.accent};
  color: ${p => p.theme.accentText};
  border-radius: ${p => p.theme.radiusSm};
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.15s, transform 0.15s;
  -webkit-app-region: no-drag;

  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &:active { transform: translateY(0); opacity: 1; }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 320px;
  color: ${p => p.theme.textMuted};
  font-size: 14px;
  animation: ${fadeIn} 0.4s ease;
  border: 2px dashed ${p => p.theme.border};
  border-radius: ${p => p.theme.radius};
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${p => p.theme.accentDim};
  border: 1px solid ${p => p.theme.borderLight};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 4px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  animation: ${fadeIn} 0.3s ease;
`;

const Card = styled.div`
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: ${p => p.theme.radius};
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s, background 0.2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

  &:hover {
    border-color: ${p => p.theme.borderLight};
    background: ${p => p.theme.surfaceHover};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06);
  }
  &:hover .delete-btn,
  &:hover .rename-btn { opacity: 1; }
`;

const CardName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${p => p.theme.text};
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 28px;
`;

const RenameInput = styled.input`
  font-size: 15px;
  font-weight: 600;
  color: ${p => p.theme.text};
  background: ${p => p.theme.surface};
  border: 1.5px solid ${p => p.theme.accent};
  border-radius: 6px;
  padding: 3px 8px;
  margin-bottom: 6px;
  width: calc(100% - 28px);
  outline: none;
  font-family: inherit;
  box-shadow: 0 0 0 3px ${p => p.theme.accentDim};
`;

const RenameBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 42px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  color: ${p => p.theme.textMuted};
  font-size: 13px;
  line-height: 1;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid ${p => p.theme.border};

  &:hover { background: rgba(255, 255, 255, 1); color: ${p => p.theme.accent}; border-color: ${p => p.theme.accent}; }
`;

const CardMeta = styled.div`
  font-size: 12px;
  color: ${p => p.theme.textMuted};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  margin-bottom: 14px;
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  ${p => p.$status === 'done' && `
    background: ${p.theme.accentDim};
    color: ${p.theme.accent};
  `}
  ${p => p.$status === 'pending' && `
    background: rgba(107,114,128,0.08);
    color: ${p.theme.textMuted};
  `}
  ${p => p.$status === 'transcribing' && `
    background: rgba(245,158,11,0.1);
    color: #D97706;
  `}
  ${p => p.$status === 'error' && `
    background: rgba(239,68,68,0.08);
    color: ${p.theme.red};
  `}
`;

const Dot = styled.span<{ $status: string }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  ${p => p.$status === 'transcribing' && 'animation: pulse 1s infinite;'}

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const DeleteBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  color: ${p => p.theme.textMuted};
  font-size: 14px;
  line-height: 1;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid ${p => p.theme.border};

  &:hover { background: rgba(255, 255, 255, 1); color: ${p => p.theme.red}; border-color: ${p => p.theme.red}; }
`;

const CardThumb = styled.div<{ $src?: string }>`
  width: 100%;
  height: 120px;
  border-radius: 6px;
  margin-bottom: 12px;
  background: ${p => p.$src ? `url(${p.$src}) center/cover no-repeat` : p.theme.bg};
  border: 1px solid ${p => p.theme.border};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: ${p => p.theme.textDim};
  flex-shrink: 0;
`;

const MissingBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: rgba(239,68,68,0.08);
  color: ${p => p.theme.red};
  margin-left: 6px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(2px);
`;

const ModalBox = styled.div`
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: ${p => p.theme.radius};
  padding: 28px 32px;
  width: 360px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
`;

const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${p => p.theme.text};
  margin-bottom: 8px;
`;

const ModalBody = styled.div`
  font-size: 13px;
  color: ${p => p.theme.textMuted};
  line-height: 1.55;
  margin-bottom: 24px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ModalCancel = styled.button`
  padding: 8px 18px;
  border-radius: ${p => p.theme.radiusSm};
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.theme.textMuted};
  border: 1px solid ${p => p.theme.border};
  transition: background 0.15s;
  &:hover { background: ${p => p.theme.accentDim}; }
`;

const ModalDelete = styled.button`
  padding: 8px 18px;
  border-radius: ${p => p.theme.radiusSm};
  font-size: 13px;
  font-weight: 600;
  background: rgba(239,68,68,0.9);
  color: #fff;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const dropFadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const DropOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  border: 2px dashed rgba(255,255,255,0.4);
  border-radius: ${p => p.theme.radius};
  background: rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  animation: ${dropFadeIn} 0.18s ease;
`;

const DropLabel = styled.span`
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
`;

const DropSub = styled.span`
  font-size: 13px;
  color: rgba(255,255,255,0.6);
`;

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 340px;
  animation: ${fadeIn} 0.2s ease;
`;

const LoadingIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${p => p.theme.accentDim};
  border: 1px solid ${p => p.theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingBar = styled.div<{ $width: string }>`
  width: ${p => p.$width};
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, ${p => p.theme.border} 0%, ${p => p.theme.accentDim} 50%, ${p => p.theme.border} 100%);
  background-size: 800px 100%;
  animation: ${shimmer} 1.5s infinite linear;
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;
`;

const SkeletonCard = styled.div`
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
  border-radius: ${p => p.theme.radius};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SkeletonRect = styled.div<{ $h?: string }>`
  width: 100%;
  height: ${p => p.$h || '120px'};
  border-radius: 6px;
  background: linear-gradient(90deg, ${p => p.theme.border} 0%, ${p => p.theme.accentDim} 50%, ${p => p.theme.border} 100%);
  background-size: 800px 100%;
  animation: ${shimmer} 1.5s infinite linear;
`;

const statusLabel: Record<string, string> = {
  pending: 'Not transcribed',
  transcribing: 'Transcribing',
  done: 'Transcribed',
  error: 'Error',
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Home() {
  const cached = getCachedProjects();
  const [projects, setProjects] = useState<Project[]>(cached || []);
  const [initialising, setInitialising] = useState(!cached);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [missingFiles, setMissingFiles] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    window.api.getProjects().then(p => {
      setProjects(p);
      setCachedProjects(p);
      setInitialising(false);
    });
  }, []);

  const checkedRef = useRef(false);
  useEffect(() => {
    if (!projects.length || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const paths = projects.map(p => p.file_path);
      const existsMap = await window.api.checkFilesExist(paths);
      const missing: Record<string, boolean> = {};
      for (const p of projects) missing[p.id] = !existsMap[p.file_path];
      setMissingFiles(missing);
      for (const p of projects) {
        if (existsMap[p.file_path] && !p.thumbnail) {
          const updated = await window.api.setVideoMeta(p.id);
          if (updated) {
            setProjects(prev => {
              const next = prev.map(x => x.id === p.id ? updated as typeof x : x);
              setCachedProjects(next);
              return next;
            });
          }
        }
      }
    })();
  }, [projects]);

  async function handleImport() {
    setLoading(true);
    try {
      const p = await window.api.importVideo();
      if (p) {
        setProjects(prev => [p, ...prev]);
        navigate(`/video/${p.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setConfirmDeleteId(id);
  }

  async function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    await window.api.deleteProject(confirmDeleteId);
    setProjects(prev => prev.filter(p => p.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  }

  function handleRenameStart(e: React.MouseEvent, id: string, currentName: string) {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentName);
  }

  async function handleRenameSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (renameValue.trim()) {
      await window.api.renameProject(id, renameValue.trim());
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue.trim() } : p));
    }
    setRenamingId(null);
  }

  function handleRenameCancel() {
    setRenamingId(null);
    setRenameValue('');
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((f: File) => /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(f.name));

    if (!videoFile) return;

    const filePath = window.api.getPathForFile(videoFile);
    if (!filePath) return;

    setLoading(true);
    try {
      const p = await window.api.importVideoPath(filePath);
      if (p) {
        setProjects(prev => [p, ...prev]);
        navigate(`/video/${p.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const confirmProject = projects.find(p => p.id === confirmDeleteId);

  return (
    <>
      <Content
        $isDragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Header>
          <Title>Projects</Title>
          <ImportBtn onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : '+ Import Video'}
          </ImportBtn>
        </Header>

        {initialising ? (
          <LoadingGrid>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i}>
                <SkeletonRect />
                <SkeletonRect $h="14px" />
                <SkeletonRect $h="10px" />
              </SkeletonCard>
            ))}
          </LoadingGrid>
        ) : projects.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🎬</EmptyIcon>
            <strong>No projects yet</strong>
            <span>Import a video to get started</span>
          </EmptyState>
        ) : (
          <Grid>
            {projects.map(p => (
              <Card key={p.id} onClick={() => navigate(`/video/${p.id}`)}>
                <CardThumb $src={toDisplayUrl(p.thumbnail)}>
                  {!p.thumbnail && '🎬'}
                </CardThumb>
                {renamingId === p.id ? (
                  <form onSubmit={e => handleRenameSubmit(e, p.id)} onClick={e => e.stopPropagation()}>
                    <RenameInput
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={handleRenameCancel}
                      onKeyDown={e => e.key === 'Escape' && handleRenameCancel()}
                    />
                  </form>
                ) : (
                  <CardName>{p.name}</CardName>
                )}
                <CardMeta>{formatDate(p.created_at)}</CardMeta>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <StatusBadge $status={p.status}>
                    <Dot $status={p.status} />
                    {statusLabel[p.status]}
                  </StatusBadge>
                  {missingFiles[p.id] && (
                    <MissingBadge title={p.file_path}>⚠ File missing</MissingBadge>
                  )}
                </div>
                <RenameBtn
                  className="rename-btn"
                  onClick={e => handleRenameStart(e, p.id, p.name)}
                  title="Rename project"
                >
                  ✎
                </RenameBtn>
                <DeleteBtn
                  className="delete-btn"
                  onClick={e => handleDeleteClick(e, p.id)}
                  title="Delete project"
                >
                  ✕
                </DeleteBtn>
              </Card>
            ))}
          </Grid>
        )}
        {isDragging && (
          <DropOverlay data-drop-overlay>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 34V20M26 20L20 26M26 20L32 26" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 36H36" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.6"/>
            </svg>
            <DropLabel>Drop your video here</DropLabel>
            <DropSub>MP4, MOV, MKV, AVI, WEBM, M4V</DropSub>
          </DropOverlay>
        )}
      </Content>

      {confirmDeleteId && (
        <ModalOverlay onClick={() => setConfirmDeleteId(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Delete project?</ModalTitle>
            <ModalBody>
              "{confirmProject?.name}" will be permanently removed. The original video file will not be deleted.
            </ModalBody>
            <ModalActions>
              <ModalCancel onClick={() => setConfirmDeleteId(null)}>Cancel</ModalCancel>
              <ModalDelete onClick={handleDeleteConfirm}>Delete</ModalDelete>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </>
  );
}