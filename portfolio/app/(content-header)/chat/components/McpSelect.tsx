'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { api } from '@/lib/axios';

import { useMcpConfig } from '../store/mcpConfig';
import McpUpsertDialog from './McpUpsertDialog';
import McpToolListDialog from './McpToolListDialog';
import { McpConfig, McpStatus } from '../types/mcp';

function StatusDot({ status }: { status?: McpStatus }) {
  const colorMap: Record<McpStatus, string> = {
    ok: 'success.main',      // 초록
    error: 'error.main',     // 빨강
    warn: 'warning.main',    // 노랑
    wait: 'info.main',       // 파랑(대기)
  };
  const key = status ?? 'wait';
  return (
    <Box
      component="span"
      sx={{
        width: 8, height: 8, borderRadius: '50%',
        bgcolor: colorMap[key], display: 'inline-block', mr: 1, flex: '0 0 auto'
      }}
    />
  );
}

export default function McpSelect() {
  const rawList = useMcpConfig(s => s.mcpList);
  const list: McpConfig[] = useMemo(
    () => (Array.isArray(rawList) ? rawList : []),
    [rawList]
  );
  const selectedId = useMcpConfig(s => s.selectedId);
  const setSelected = useMcpConfig(s => s.setSelected);
  const refreshFromServer = useMcpConfig(s => s.refreshFromServer);

  const [openCreate, setOpenCreate] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const editTarget = list.find(i => i.id === editTargetId);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toolTargetId, setToolTargetId] = useState<string | null>(null);

  // 삭제 실행
  const handleDelete = async (deleteId: string) => {
    if (!deleteId) return;
    try {
      const res = await api.delete("/api/mcp", { data: { targetId: deleteId } });
      if (res.data.ok) {
        // 선택돼 있던 걸 지우면 선택 초기화/변경
        if (selectedId === deleteId) {
          const remain = list.filter(i => i.id !== deleteId);
          setSelected(remain[0]?.id);
        }
        await refreshFromServer();
      }
    } catch (e) {
      console.error('삭제 실패:', e);
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="mcp-label">MCP</InputLabel>
        <Select
          labelId="mcp-label"
          label="MCP"
          value={selectedId ?? ''}
          onChange={(e) => setSelected(e.target.value as string)}
          MenuProps={{ PaperProps: { sx: { minWidth: 280 } } }}
          // 닫힌 상태: 상태 점 + 이름만
          renderValue={(value) => {
            const item = list.find(i => i.id === value);
            return item ? item.name  : '';   // 상태 점 제거
          }}
        >
          {list.map(item => {
            const showTip = item.status !== 'ok' && !!item.statusMessage;

            return (
              <MenuItem
                key={item.id}
                value={item.id}
                sx={{
                  '& .row-actions': { opacity: 0, transition: 'opacity .15s' },
                  '&:hover .row-actions': { opacity: 1 },
                }}
              >
                <Tooltip
                  title={item.statusMessage ?? ''}
                  placement="right"
                  arrow
                  disableHoverListener={!showTip}  // ok면 툴팁 비활성화
                  componentsProps={{
                    tooltip: { sx: { maxWidth: 420, whiteSpace: 'pre-line' } }, // 긴 메시지 대비
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <StatusDot status={item.status} />
                    <Box sx={{ flex: 1, pr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </Box>

                    {/* 옵션에서만 보이는 액션 아이콘들 */}
                    <Box className="row-actions" sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setEditTargetId(item.id); }}
                        title="수정"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        title="삭제"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setToolTargetId(item.id); }}
                        title="정보(툴)"
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Tooltip>
              </MenuItem>
            );
          })}

          {/* + MCP 추가 */}
          <MenuItem onClick={() => setOpenCreate(true)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddCircleOutlineIcon fontSize="small" /> MCP 추가
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* 신규 추가 다이얼로그 */}
      <McpUpsertDialog
        open={openCreate}
        mode="C"
        onClose={() => setOpenCreate(false)}
      />

      {/* 수정 다이얼로그 (연필 아이콘 클릭 시) */}
      <McpUpsertDialog
        open={!!editTarget}
        mode="R"
        initial={editTarget}
        onClose={() => setEditTargetId(null)}
      />

      {/* MCP 툴 리스트 다이얼로그 */}
      <McpToolListDialog
        open={!!toolTargetId}
        mcpId={toolTargetId || ''}
        onClose={() => setToolTargetId(null)}
      />
    </>
  );
}
