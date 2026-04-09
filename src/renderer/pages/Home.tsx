import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Project } from '../../renderer/types';

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${p => p.theme.bg};
`;

const TitleBar = styled.div`
  height: 52px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding: 0 20px 0 80px;
  border-bottom: 1px solid ${p => p.theme.border};
  flex-shrink: 0;
`;

const AppName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.textMuted};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
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
  gap: 8px;
  padding: 9px 18px;
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
  min-height: 300px;
  color: ${p => p.theme.textMuted};
  font-size: 14px;
  animation: ${fadeIn} 0.4s ease;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${p => p.theme.surface};
  border: 1px solid ${p => p.theme.border};
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
  transition: border-color 0.15s, transform 0.15s, background 0.15s;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${p => p.theme.borderLight};
    background: ${p => p.theme.surfaceHover};
    transform: translateY(-2px);
  }
  &:hover .delete-btn { opacity: 1; }
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

const CardMeta = styled.div`
  font-size: 12px;
  color: ${p => p.theme.textMuted};
  font-family: 'DM Mono', monospace;
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
    background: rgba(200,240,96,0.12);
    color: ${p.theme.accent};
  `}
  ${p => p.$status === 'pending' && `
    background: rgba(255,255,255,0.05);
    color: ${p.theme.textMuted};
  `}
  ${p => p.$status === 'transcribing' && `
    background: rgba(255,200,80,0.1);
    color: #ffc850;
  `}
  ${p => p.$status === 'error' && `
    background: rgba(255,95,95,0.1);
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

  &:hover { background: rgba(255,95,95,0.15); color: ${p => p.theme.red}; }
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const p = await window.api.getProjects();
    setProjects(p);
  }, []);

  useEffect(() => { load(); }, [load]);

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

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await window.api.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return (
    <Shell>
      <TitleBar>
        <AppName>Scribe</AppName>
      </TitleBar>
      <Content>
        <Header>
          <Title>Projects</Title>
          <ImportBtn onClick={handleImport} disabled={loading}>
            {loading ? '…' : '+ Import Video'}
          </ImportBtn>
        </Header>

        {projects.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🎬</EmptyIcon>
            <strong>No projects yet</strong>
            <span>Import a video to get started</span>
          </EmptyState>
        ) : (
          <Grid>
            {projects.map(p => (
              <Card key={p.id} onClick={() => navigate(`/video/${p.id}`)}>
                <CardName>{p.name}</CardName>
                <CardMeta>{formatDate(p.created_at)}</CardMeta>
                <StatusBadge $status={p.status}>
                  <Dot $status={p.status} />
                  {statusLabel[p.status]}
                </StatusBadge>
                <DeleteBtn
                  className="delete-btn"
                  onClick={e => handleDelete(e, p.id)}
                  title="Delete project"
                >
                  ✕
                </DeleteBtn>
              </Card>
            ))}
          </Grid>
        )}
      </Content>
    </Shell>
  );
}