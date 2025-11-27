// app/(main)/page.tsx
"use client";

import { Box, Button, Card, CardContent, CardHeader, Divider, FormControl, IconButton, InputLabel, MenuItem, Popover, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useMemo, useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
import type { ChatMessage } from './types/chat';
import ChatMessages from '@/app/(content-header)/chat/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/app/(content-header)/chat/components/ChatInput';
import { streamChatCompletion } from './lib/chatClient';

import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { useChat } from './store/chat';
import McpSelect from '@/app/(content-header)/chat/components/McpSelect';
import { useMcpConfig } from './store/mcpConfig';
// import { McpClient } from '@/lib/agent/mcpClient';

export default function ChatPage() {

  // ==================== System Prompt ====================
  const DEFAULT_SYSTEM_PROMPT = process.env.SYSTEM_PROMPT_KO ?? '당신은 react-admin 프로젝트의 개발을 돕는 조력자입니다.';
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_SYSTEM_PROMPT;
    return localStorage.getItem('systemPrompt') ?? DEFAULT_SYSTEM_PROMPT;
  });

  // const SYSTEM_PROMPT_EN = 'You are a helpful assistant for a react-admin project.';
  const createInitialMessages = (sp: string): ChatMessage[] => ([
    { id: crypto.randomUUID(), role: 'system', content: sp, createdAt: Date.now() }
  ]);
  // 초기 상태도 헬퍼로
  const [messages, setMessages] = useState<ChatMessage[]>(() => createInitialMessages(systemPrompt));

  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<ChatInputRef>(null);

  // 스크롤 상태
  const scrollRef = useRef<HTMLDivElement>(null); // 스크롤 컨테이너
  const endRef    = useRef<HTMLDivElement>(null); // 맨 아래 앵커
  const [stick, setStick] = useState(true);       // 바닥 고정 여부

  // 컴포넌트 내부
  const [hasVScroll, setHasVScroll] = useState(false);
  const [mode, setMode] = useState('chat');
  const [model, setModel] = useState('gpt-4o-mini');
  // const [mcp, setMcp] = useState('mcp111');

  // ====================================================================================
  // 스크롤 상태 업데이트
  const updateHasVScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // 세로 스크롤이 필요하고(내용이 넘침) + 스크롤바가 레이아웃 공간을 실제로 차지하는지(Windows 등)
    const needsScroll = el.scrollHeight > el.clientHeight + 1;
    const occupiesSpace = (el.offsetWidth - el.clientWidth) > 0; // macOS 오버레이 스크롤바는 0
    setHasVScroll(needsScroll && occupiesSpace);
  }, []);
  useLayoutEffect(() => { updateHasVScroll(); }, [updateHasVScroll, messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateHasVScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateHasVScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setStick(nearBottom);
    updateHasVScroll();
  };

  const scrollToBottom = (smooth = false) => {
    if (!stick) return;
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    });
  };

  useLayoutEffect(() => { scrollToBottom(false); }, []);          // 최초
  useLayoutEffect(() => { scrollToBottom(true); }, [messages]);   // 메시지 변경 시

  // ====================================================================================

  // ====================== mcp 초기화 =============================
  const refresh = useMcpConfig(s => s.refreshFromServer);

  useEffect(() => {
    useChat.setState({ mode, model });
    if (mode === "agent") {
      refresh().catch(console.error);
    }
  }, [mode, model]);

  // 메시지 전송
  const historyForLLM = useMemo(
    () => messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
    [messages]
  );

  const send = async (text: string) => {
    if (isStreaming) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }]);

    setIsStreaming(true);
    const aborter = new AbortController();
    abortRef.current = aborter;

    try {
      await streamChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          ...historyForLLM,
          { role: 'user', content: text },
        ],
        (chunk) => {
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        },
        aborter.signal,
        { mode, model }
      );
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ 오류: ${(err as Error).message}` } : m));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onReset = () => {
    // 1) 진행 중 스트림이 있으면 중단
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);

    // 2) 메시지 초기화 (system 한 줄만)
    setMessages(createInitialMessages(systemPrompt));

    // 3) 스크롤/입력창 상태 초기화
    setStick(true);
    requestAnimationFrame(() => {
      // ChatInputRef에 clear()가 있다면 호출 (없다면 focus만)
      // inputRef.current?.clear?.();
      inputRef.current?.focus();
      // 스크롤 맨 아래로
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    });
  };
  
  // ==================== 설정 Popover ====================
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const settingsOpen = Boolean(settingsAnchor);
  const onOpenSettings = (e: React.MouseEvent<HTMLElement>) => setSettingsAnchor(e.currentTarget);
  const onCloseSettings = () => setSettingsAnchor(null);

  // 임시 입력값 관리(취소 시 되돌리기)
  const [editingPrompt, setEditingPrompt] = useState<string>(systemPrompt);
  useEffect(() => { if (!settingsOpen) setEditingPrompt(systemPrompt); }, [settingsOpen, systemPrompt]);

  const applySettings = () => {
    setSystemPrompt(editingPrompt.trim() || DEFAULT_SYSTEM_PROMPT);
    onCloseSettings();
  };
  const resetToDefault = () => {
    setEditingPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  // ====================== mcp config =============================
  useEffect(() => {
    if (mode !== 'agent') return;
    const selected = useMcpConfig.getState().mcpList.find(x => x.id === useMcpConfig.getState().selectedId);
    if (!selected) return;
    
    // const client = new McpClient({ url: "", timeoutMs: 15000 });
    // (async () => {
    //   try {
    //     await client.connect();
    //     // ... listTools, 전역보관 등
    //   } catch (e) { console.error(e); }
    // })();
  }, [useMcpConfig(s => s.selectedId)]);

  // useEffect(() => {
  //   refresh().catch(console.error);
  // }, [refresh]);

  return (
    <>
      <Card
        sx={{
          height: 'calc(100vh - 104px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Typography variant="h6" fontWeight={700}>Chat</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={onReset}
              >
                초기화
              </Button>
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              {mode=="agent" && (
                <McpSelect />
              )}
              <FormControl size="small" sx={{ minWidth: 60 }}>
                <InputLabel id="mode-label">mode</InputLabel>
                <Select
                  labelId="mode-label"
                  label="모드"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <MenuItem value="chat">chat</MenuItem>
                  <MenuItem value="agent">agent</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="model-label">model</InputLabel>
                <Select
                  labelId="model-label"
                  label="모델"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <MenuItem value="gpt-4o-mini">GPT-4o-mini</MenuItem>
                  <MenuItem value="gpt-4-turbo">gpt-4-turbo</MenuItem>
                  <MenuItem value="gpt-4.1">GPT-4.1</MenuItem>
                </Select>
              </FormControl>

              <Tooltip title="설정">
                <IconButton onClick={onOpenSettings} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />

        {/* ▼ 옵션 레이어팝업 (헤더 아래) */}
        <Popover
          open={settingsOpen}
          anchorEl={settingsAnchor}
          onClose={onCloseSettings}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { width: 520, p: 2 } } }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            옵션
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">System Prompt</Typography>
            <TextField
              multiline
              minRows={5}
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              fullWidth
              placeholder="시스템 프롬프트를 입력하세요"
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
              <Button size="small" onClick={resetToDefault}>기본값</Button>
              <Button size="small" onClick={onCloseSettings}>취소</Button>
              <Button size="small" variant="contained" onClick={applySettings}>적용</Button>
            </Stack>
          </Stack>
        </Popover>

        <CardContent
          sx={{
            flex: 1,
            p: 0,
            display: 'grid',
            gridTemplateRows: '1fr auto',
            minHeight: 0,
            overflow: 'hidden',
            // ✅ MUI 기본 &:last-child 패딩을 5px로 강제
            '&:last-child': { paddingBottom: '5px' },
          }}
        >
          {/* 스크롤 컨테이너 */}
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            sx={{ overflowY: 'auto', minHeight: 0, scrollbarGutter: 'stable both-edges', mr: hasVScroll ? '32px' : 0,
    transition: 'margin-right .15s ease',}}
          >
            <Box sx={{ pt: 2, px: 2, pb: 0 }}>
              <ChatMessages messages={messages.filter(m => m.role !== 'system')} />
              <Box ref={endRef} sx={{ height: 1 }} />
            </Box>
          </Box>

          {/* 입력창 래퍼: 아래 여백 0, 위쪽만 간격 */}
          <Box sx={{ px: 2, pt: 2, pb: 0 }}>
            <ChatInput ref={inputRef} onSend={send} disabled={isStreaming} />
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
