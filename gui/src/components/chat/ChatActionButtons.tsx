import { PlusIcon, ClockIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";
import styled from "styled-components";
import { HistoryDropdown } from "./HistoryDropdown";
import { SessionMetadata } from "core";

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 9px;
  font-weight: 500;
  border-radius: 6px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 24px;
  min-width: 24px;
  max-height: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transition: width 0.3s ease, height 0.3s ease;
    transform: translate(-50%, -50%);
    z-index: 0;
  }

  &:hover {
    background-color: var(--vscode-button-hoverBackground);
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    &::before {
      width: 40px;
      height: 40px;
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
    transition: all 0.1s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  svg {
    width: 14px;
    height: 14px;
    position: relative;
    z-index: 1;
    transition: all 0.15s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }
`;

const HistoryButtonContainer = styled.div`
  position: relative;
`;

interface ChatActionButtonsProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  sessions?: SessionMetadata[];
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionEdit?: (sessionId: string, newTitle: string) => void;
}

export function ChatActionButtons({
  onNewChat,
  onToggleHistory,
  sessions = [],
  currentSessionId,
  onSessionSelect = () => {},
  onSessionDelete = () => {},
  onSessionEdit = () => {}
}: ChatActionButtonsProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleNewChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('새 채팅 버튼 클릭됨');
    onNewChat();
  };

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('히스토리 버튼 클릭됨');
    setIsHistoryOpen(prev => !prev);
    // 기존의 onToggleHistory는 더 이상 사용하지 않음
  };

  const handleHistoryClose = () => {
    setIsHistoryOpen(false);
  };

  return (
    <RightSection>
      <ActionButton onClick={handleNewChatClick}>
        <PlusIcon />
      </ActionButton>

      <HistoryButtonContainer>
        <ActionButton onClick={handleHistoryClick}>
          <ClockIcon />
        </ActionButton>

        <HistoryDropdown
          isOpen={isHistoryOpen}
          onClose={handleHistoryClose}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={onSessionSelect}
          onSessionDelete={onSessionDelete}
          onSessionEdit={onSessionEdit}
        />
      </HistoryButtonContainer>
    </RightSection>
  );
}