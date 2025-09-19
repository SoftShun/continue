import React from "react";
import styled from "styled-components";
import { SessionMetadata } from "core";
import { ChatTabsSelector } from "./ChatTabsSelector";
import { ChatActionButtons } from "./ChatActionButtons";

const ActionBarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-widget-border);
  border-top: 1px solid var(--vscode-widget-border);
  flex-shrink: 0;
  min-height: 48px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
`;


interface ChatTab {
  id: string;
  title: string;
  timestamp: number;
  isActive: boolean;
}

interface ChatActionBarProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  isHistoryOpen?: boolean;
  tabs?: ChatTab[];
  onTabSelect?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabTitleEdit?: (tabId: string, newTitle: string) => void;
  sessions?: SessionMetadata[];
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionEdit?: (sessionId: string, newTitle: string) => void;
}

export function ChatActionBar({
  onNewChat,
  onToggleHistory,
  isHistoryOpen = false,
  tabs = [],
  onTabSelect = () => {},
  onTabClose = () => {},
  onTabTitleEdit = () => {},
  sessions = [],
  currentSessionId,
  onSessionSelect = () => {},
  onSessionDelete = () => {},
  onSessionEdit = () => {},
}: ChatActionBarProps) {
  const handleToggleHistory = () => {
    console.log('ChatActionBar: 히스토리 토글 핸들러 호출됨');
    onToggleHistory();
  };
  return (
    <ActionBarContainer>
      <LeftSection>
        <ChatTabsSelector
          tabs={tabs}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          onTabTitleEdit={onTabTitleEdit}
        />
      </LeftSection>

      <ChatActionButtons
        onNewChat={onNewChat}
        onToggleHistory={handleToggleHistory}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={onSessionSelect}
        onSessionDelete={onSessionDelete}
        onSessionEdit={onSessionEdit}
      />
    </ActionBarContainer>
  );
}