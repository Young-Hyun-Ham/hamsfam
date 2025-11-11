/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  List, ListItem, ListItemText, Chip, Stack, CircularProgress, Box, Typography,
  ButtonProps,
  IconButton,
  Collapse,
  ChipProps
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMcpConfig } from '../store/mcpConfig';
import { McpToolSpec } from '../types/mcp';

// --- 타입 & 라벨/컬러 매핑
type GlobalState = ToolState | 'mixed';
type ToolState = 'auto' | 'user' | 'none';
const STATE_LABEL: Record<ToolState, string> = {
  auto: '자동',
  user: '사용자',
  none: '사용안함',
};
const STATE_COLOR: Record<ToolState, ChipProps['color']> = {
  auto: 'primary',
  user: 'success',
  none: 'warning',
};
type ToolsPayload = McpToolSpec[] | { tools: McpToolSpec[] } | undefined | null;

type Props = {
  open: boolean;
  mcpId: string;
  onClose: () => void;
};

export default function McpToolListDialog({ open, mcpId, onClose }: Props) {
  
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<McpToolSpec[]>([]);
  const [error, setError] = useState<string | null>(null);
  // const mcpList = useMcpConfig(s => s.mcpList);
  const rawList = useMcpConfig(s => s.mcpList);
  const mcpList = useMemo(
    () => (Array.isArray(rawList) ? rawList : []),
    [rawList]
  );
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  // 설명 토글 상태
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  const ORDER: ToolState[] = ['auto', 'user', 'none'];

  function toArrayTools(payload: ToolsPayload): McpToolSpec[] {
    if (!payload) return [];
    return Array.isArray(payload) ? payload : (payload.tools ?? []);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 서버에서 해당 MCP의 툴 목록을 반환하도록 구현: GET /api/mcp/:id/tools
        // const res = await api.get(`/api/mcp/${mcpId}/tools`, { withCredentials: true });
        // setTools(res.data?.tools ?? []);
        const tools: McpToolSpec[] = mcpList.find(d => d.id === mcpId)?.tools ?? [];
        setTools(toArrayTools(tools));
      } catch (e: any) {
        console.error(e);
        setError('툴 목록을 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  // 툴이 바뀌면 초기 상태를 '자동'으로 채워둠(없는 항목만)
  useEffect(() => {
    setToolStates(prev => {
      const next = { ...prev };
      (tools ?? []).forEach(t => {
        if (!next[t.name]) next[t.name] = 'auto';
      });
      return next;
    });
  }, [tools]);

  // --- 전체 상태 계산: 모두 같으면 그 상태, 아니면 'mixed'
  const globalState: GlobalState = useMemo(() => {
    const names = (tools ?? []).map(t => t.name);
    if (names.length === 0) return 'mixed';
    const first = toolStates[names[0]] ?? 'auto';
    const allSame = names.every(n => (toolStates[n] ?? 'auto') === first);
    return allSame ? first : 'mixed';
  }, [tools, toolStates]);

  // --- 전체 상태 일괄 변경
  const setAllStates = (next: ToolState) => {
    setToolStates(prev => {
      const map: Record<string, ToolState> = { ...prev };
      (tools ?? []).forEach(t => { map[t.name] = next; });
      return map;
    });
    // TODO: 서버에 일괄 저장하려면 여기서 api.patch 호출
  };

  // --- 전체 토글 사이클: 혼합이면 '자동'부터 시작
  const cycleGlobal = () => {
    const base: ToolState = globalState === 'mixed' ? 'auto' : globalState;
    const next = ORDER[(ORDER.indexOf(base) + 1) % ORDER.length];
    setAllStates(next);
  };

  const cycleToolState = (name: string) => {
    setToolStates(prev => {
      const order: ToolState[] = ['auto', 'user', 'none'];
      const curr = prev[name] ?? 'auto';
      const next = order[(order.indexOf(curr) + 1) % order.length];
      return { ...prev, [name]: next };
    });
    // TODO: 필요하면 여기서 서버에 PATCH 호출로 상태 저장
  };

  return (

    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography variant="h6">Tool LIST</Typography>

          <Chip
            // 혼합이면 별도 표기/색
            label={globalState === 'mixed' ? '혼합' : STATE_LABEL[globalState]}
            size="small"
            color={globalState === 'mixed' ? 'default' : STATE_COLOR[globalState]}
            variant={globalState === 'none' ? 'outlined' : 'filled'}
            clickable
            onClick={cycleGlobal}
            sx={{
              height: 24,
              borderRadius: '16px',
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} /> <Typography>불러오는 중…</Typography>
          </Box>
        )}
        {!loading && error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          tools?.length ? (
            
            <List dense sx={{ pt: 0 }}>
              {(tools ?? []).map((t) => {
                const state = toolStates[t.name] ?? 'auto';
                const open = !!expanded[t.name];

                return (
                  <Box key={t.name} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ListItem
                      disableGutters
                      // secondaryAction을 쓰면 오른쪽 공간을 위해 pr 보정 필요
                      sx={{ alignItems: 'center', pr: 9 }}
                      secondaryAction={
                        <Chip
                          label={STATE_LABEL[state]}
                          size="small"
                          color={STATE_COLOR[state]}
                          variant={state === 'none' ? 'outlined' : 'filled'}
                          clickable
                          onClick={(e) => {
                            e.stopPropagation();      // 펼침 토글과 클릭 분리
                            cycleToolState(t.name);
                          }}
                          sx={{
                            height: 24,
                            borderRadius: '16px',
                            '& .MuiChip-label': { px: 1.25 },
                          }}
                        />
                      }
                      onClick={() => toggleExpand(t.name)}  // 행 전체 클릭으로도 접고/펴기
                    >
                      {/* 왼쪽 펼침 아이콘 */}
                      <IconButton
                        edge="start"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(t.name); }}
                        aria-label="expand"
                        aria-expanded={open}
                        sx={{
                          mr: 1,
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform .15s',
                        }}
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>

                      {/* 툴 이름(핑) 칩 - 좌측 */}
                      <ListItemText
                        primary={<Chip label={t.name} size="small" sx={{ mr: 1 }} />}
                        primaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>

                    {/* 접고/펴는 설명 영역 */}
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          pl: 5.5,            // 왼쪽 아이콘+칩 자리를 맞춰 들여쓰기
                          pr: 10,             // 오른쪽 secondaryAction(상태 Chip)과 겹치지 않게 여백
                          pb: 1.25,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {t.description}
                        </Typography>
                        {/* 필요하면 스키마 등 추가 정보도 여기에 */}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </List>

          ) : (
            <Typography>등록된 툴이 없습니다.</Typography>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
