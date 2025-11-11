// src/components/chat/ChatInput.tsx

// 1. react에서 'forwardRef'를 추가로 import 합니다.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, TextField, IconButton, useTheme } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

// 2. 부모가 ref를 통해 호출할 함수의 타입을 미리 정의합니다.
export interface ChatInputRef {
  focus: () => void;
}

// 3. 컴포넌트 전체를 forwardRef로 감싸고, 두 번째 인자로 ref를 받도록 수정합니다.
const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ onSend, disabled }, ref) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  useEffect(()=> {
    // 초기 input box 포커스
    inputRef.current?.focus();
  }, []);

  // ✅ 전송 종료 등으로 disabled=false가 되면 다시 포커스
  useEffect(() => {
    if (!disabled) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [disabled]);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Shift 키를 누르지 않고 Enter를 누를 때만 전송
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // 기본 동작(줄바꿈) 방지
      handleSend();
    }
  };

  // 4. useImperativeHandle을 사용해 부모가 ref로 호출할 수 있는 함수를 정의합니다.
  useImperativeHandle(ref, () => ({
    // 'focus'라는 이름으로 기능을 노출시킵니다.
    focus: () => {
      // 내부 input 요소에 직접 focus() 명령을 내립니다.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    },
  }));

  return (
    <Box sx={{
      margin: { xs: 1, sm: 2 },
      padding: 1,
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#40414F',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={10}
        variant="standard"
        placeholder="메시지를 입력하세요..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        InputProps={{
          disableUnderline: true,
        }}
        sx={{
          '& .MuiInputBase-root': {
            color: '#FFFFFF',
            padding: '8px 12px',
          },
          '& .MuiInputBase-input::placeholder': {
            color: theme.palette.grey[500],
          },
        }}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        sx={{
          backgroundColor: (disabled || !text.trim()) ? theme.palette.action.disabledBackground : 'primary.main',
          color: (disabled || !text.trim()) ? theme.palette.action.disabled : 'primary.contrastText',
          '&:hover': {
            backgroundColor: (disabled || !text.trim()) ? theme.palette.action.disabledBackground : 'primary.dark',
          },
          marginLeft: 1,
        }}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput; 