'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  Box,
  ClickAwayListener,
  Tooltip,
  Typography,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { api } from '@/lib/axios';

import { useMcpConfig } from '../store/mcpConfig';
import { McpConfig, McpType } from '../types/mcp';
import { diffMcpLists, toCsv } from '../utils/utils';

type Props = {
  open: boolean;
  mode: 'C' | 'R';
  initial?: Partial<McpConfig>;
  onClose: () => void;
};

type McpForm = {
  id: string;
  name: string;
  type: McpType;
  url: string;
  baseUrl: string;
  cmd: string;
  cmdArgs: string;
  cmdEnv: string;
  description: string;
};

export default function McpUpsertDialog({ open, mode, initial, onClose }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [canSave, setCanSave] = useState(true);

  const addMcp = useMcpConfig(s => s.addMcp);
  const update = useMcpConfig(s => s.update);
  const remove = useMcpConfig(s => s.remove);
  const refresh = useMcpConfig(s => s.refreshFromServer);

  const DEFAULTS: McpForm = {
    id: '',
    name: '',
    type: 'stdio',
    url: 'ws://',
    baseUrl: 'https://api.example.com',
    cmd: 'cmd',
    cmdArgs: '',
    cmdEnv: '',
    description: '',
  };

  const [form, setForm] = useState<McpForm>(DEFAULTS);
  useEffect(() => {
    if (!open) return;
    if (mode === 'R' && initial) {
      setForm({
        id: initial.id ?? '',
        name: initial.name ?? '',
        type: (initial.type as McpType) ?? 'stdio',
        url: initial.url ?? 'ws://',
        baseUrl: initial.baseUrl ?? 'https://api.example.com',
        cmd: initial.cmd ?? 'cmd',
        cmdArgs: initial.args ? toCsv(initial.args) : '',
        cmdEnv: initial.env ? toCsv(initial.env) : '',
        description: initial.description ?? '',
      });
    } else {
      // 생성 모드: 열릴 때 새 ID 발급
      setForm({ ...DEFAULTS, id: crypto.randomUUID() });
    }
  }, [open]);
  // const id = form.id ?? crypto.randomUUID();

  // 타입별 필수값 검증
  useEffect(() => {
    const ok =
      form.id.trim().length > 0 &&
      (form.type === 'websocket' ? /^wss?:\/\//.test(form.url.trim())
      : form.type === 'http'    ? /^https?:\/\//.test(form.baseUrl.trim())
      : form.type === 'stdio'   ? form.cmd.trim().length > 0
      : false);
    setCanSave(ok);
  }, [form.id, form.type, form.url, form.baseUrl, form.cmd]);

  const [savedToast, setSavedToast] = useState(false);
  const [savedErrorToast, setSavedErrorToast] = useState(false);

  // 저장
  const handleSave = async () => {
    if (!canSave) return;
    
    setCanSave(false);
    try {
      // 1) store 상태 변경 전 mcp list data 스냅샷
      const prev = useMcpConfig.getState().mcpList;
      // useMcpConfig.getState().update(prev[0].id, {name: name});
      // 2) 저장
      if (mode === "C") {
        addMcp({
          id: form.id,
          name: form.name.trim(),
          type: form.type,
          url: form.type === 'websocket' ? form.url.trim() : undefined,
          baseUrl: form.type === 'http' ? form.baseUrl.trim() : undefined,
          cmd: form.type === 'stdio' ? form.cmd.trim() : undefined,
          args: form.type === 'stdio' ? form.cmdArgs.trim() : undefined,
          env: form.type === 'stdio' ? form.cmdEnv.trim() : undefined,
          description: form.description.trim() || undefined,
          createdAt: Date.now(),
        });
      } else {
        update(form.id, form);
      }

      // 3) 변경 부분 반영 mcp list 가져오기
      const latest = useMcpConfig.getState().mcpList;
      // 4) diff 계산 (status/statusMessage는 무시)
      const diffs = diffMcpLists(prev, latest, ['status', 'statusMessage']);
      // 5) 보기 좋게 테이블로
      // console.table(
      //   diffs.map((d) => ({
      //     id: d.id,
      //     crud: d.crud,
      //     changed: d.changedKeys?.join(', ') ?? '',
      //   }))
      // );
      // diffs.map((data) => {
      //   console.log("diffs data ================>", data);
      // });
      // console.log("prev data ================>", prev);
      // console.log("latest data ================>", latest);
      
      const { data, status } = await api.post('/api/mcp', { data: latest });
      if (status < 400) {
        try {
          // tools 처리
          api.post('/api/mcp/tools', { data: data.data.mcp_data });
        } catch (e) {
          console.log("[ tools error ] : ", e);
        }
        console.log("저장 후 ", data.data.mcp_data)
        // const afterData: McpForm = data.data.mcp_data;
        // setForm({ ...afterData });
        // 성공 처리
        setSavedToast(true); // 저장완료 알림창
      } else {
        // 실패 처리
        setSavedErrorToast(true);
        initForm(false); // 초기화만
        remove(form.id);
      }

    } catch (e) {
      console.error(e);
      initForm(false);
      remove(form.id);
      setSavedErrorToast(true);
    }
  }

  function initForm(isClose: boolean) {
    if (isClose) onClose();

    setForm({ ...DEFAULTS });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper(ownerState) { ownerState.sx = { height: 520 } } }}
    >
      <DialogTitle>
        <Box component="span" sx={{ flex: 1 }}>MCP 추가</Box>

        {/* ? 아이콘 + 클릭 툴팁 */}
        <ClickAwayListener onClickAway={() => setHelpOpen(false)}>
          <Tooltip
            arrow
            placement="bottom-end"
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            disableHoverListener   // hover로는 안 열림
            disableFocusListener
            disableTouchListener
            componentsProps={{      // MUI v5
              tooltip: { sx: { maxWidth: 380, p: 1 } }
            }}
            // slotProps={{ tooltip: { sx: { maxWidth: 380, p: 1 } } }} // MUI v6이면 이 줄로
            title={
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: .5 }}>
                  MCP 설정 도움말
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                  <li><b>websocket</b>: <code>ws://</code> or <code>wss://</code> 로 시작하는 URL</li>
                  <li><b>http</b>: HTTP Base URL만 입력 (예: <code>https://api.example.com</code>)</li>
                  <li><b>stdio</b>: 로컬 명령 실행 (Command + Arguments)</li>
                </ul>
                <Typography variant="caption" sx={{ display: 'block', mt: .5 }}>
                  저장 후 드롭다운에서 선택하면 해당 MCP로 연결됩니다.
                </Typography>
              </Box>
            }
          >
            <IconButton
              size="small"
              onClick={() => setHelpOpen(v => !v)}
              aria-label="MCP 설정 도움말"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ClickAwayListener>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="MCP 명"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="예: mcp-dev, allegro-mcp"
            autoFocus
            fullWidth
            size="small"
            helperText={'공백/특수문자는 -로 치환됩니다.'}
          />
          <TextField
            label="MCP ID (자동 생성)"
            value={form.id}
            size="small"
            fullWidth
            disabled
          />
          
          {/* MCP Type 콤보 */}
          <FormControl size="small" fullWidth>
            <InputLabel id="mcp-type-label">MCP Type</InputLabel>
            <Select
              labelId="mcp-type-label"
              label="MCP Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as McpType })}
            >
              <MenuItem value="websocket">websocket</MenuItem>
              <MenuItem value="stdio">stdio</MenuItem>
              <MenuItem value="http">http</MenuItem>
            </Select>
          </FormControl>

          {/* 타입별 입력 필드 스위칭 */}
          {form.type === 'websocket' && (
            <TextField
              label="WebSocket URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="ws://localhost:8080"
              fullWidth
              size="small"
            />
          )}

          {form.type === 'http' && (
            <TextField
              label="HTTP Base URL"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.example.com"
              fullWidth
              size="small"
            />
          )}

          {form.type === 'stdio' && (
            <>
              <TextField
                label="Command (stdio)"
                value={form.cmd}
                onChange={(e) => setForm({ ...form, cmd: e.target.value })}
                placeholder="예: cmd"
                fullWidth
                size="small"
              />
              <TextField
                label="Arguments (쉼표(,) 구분)"
                value={form.cmdArgs}
                onChange={(e) => setForm({ ...form, cmdArgs: e.target.value })}
                placeholder="예: \c npx -y figma-developer-mcp"
                fullWidth
                size="small"
              />
              <TextField
                label="env (쉼표(,) 구분)"
                value={form.cmdEnv}
                onChange={(e) => setForm({ ...form, cmdEnv: e.target.value })}
                placeholder="예: FIGMA_API_KEY : <your-figma-api-key>"
                fullWidth
                size="small"
              />
            </>
          )}

          <TextField
            label="설명 (선택)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="이 MCP의 용도/환경 설명"
            fullWidth
            size="small"
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          variant="outlined"
        >
          닫기
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!canSave}
        >
          저장
        </Button>
      </DialogActions>

      <Snackbar
        open={savedErrorToast}
        autoHideDuration={2000}
        onClose={() => setSavedErrorToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}  // 레이어팝업 느낌 (상단 중앙)
      >
        <Alert
          onClose={() => setSavedErrorToast(false)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          저장에 실패하었습니다.
        </Alert>
      </Snackbar>

      <Snackbar
        open={savedToast}
        autoHideDuration={2000}
        onClose={() => {
          setForm({ ...DEFAULTS });
          setSavedToast(false);
          setCanSave(true);
          onClose();                            // 여기서 다이얼로그 닫기
          refresh().catch(console.error);
          
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}  // 레이어팝업 느낌 (상단 중앙)
      >
        <Alert
          onClose={() => setSavedToast(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          저장되었습니다.
        </Alert>
      </Snackbar>
      
    </Dialog>
  );
}
