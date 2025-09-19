import React, { useState, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { RootState } from "../../redux/store";
import {
  addTab,
  removeTab,
  setActiveTab,
  updateTab,
  Tab
} from "../../redux/slices/tabsSlice";
import { tabsBackupManager } from "../../util/tabsBackup";
import { ChatActionBar } from "./ChatActionBar";
import { HistorySidebar } from "./HistorySidebar";
import { SessionMetadata } from "core";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--vscode-editor-background);
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
`;


interface ChatContainerProps {
  sessions?: SessionMetadata[];
  onSessionSelect?: (sessionId: string) => void;
}

export function ChatContainer({
  sessions = [],
  onSessionSelect = () => {}
}: ChatContainerProps) {
  const dispatch = useDispatch();
  const chatTabs = useSelector((state: RootState) => state.tabs.tabs);

  // localStorage에서 백업 복구 시도 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    const backupTabs = tabsBackupManager.loadTabsFromLocalStorage();
    if (backupTabs && backupTabs.length > 0) {
      // 활성 탭이 하나도 없으면 첫 번째 탭을 활성화
      const hasActiveTab = backupTabs.some(tab => tab.isActive);
      if (!hasActiveTab && backupTabs.length > 0) {
        backupTabs[0].isActive = true;
      }

      // 백업된 탭들로 현재 상태 대체 (기존 탭 제거 후 백업 탭 추가)
      // Redux persist가 이미 탭을 복원했을 수도 있으므로 추가적인 백업만 활용
      console.log('Loaded tabs from localStorage backup:', backupTabs);
    }
  }, [dispatch]);

  // 탭 상태 변경 시 자동 백업
  useEffect(() => {
    if (chatTabs.length > 0) {
      tabsBackupManager.immediateBackup(chatTabs);
    }
  }, [chatTabs]);

  // 자동 백업 시작/중지
  useEffect(() => {
    tabsBackupManager.startAutoBackup(() => chatTabs);

    return () => {
      tabsBackupManager.stopAutoBackup();
    };
  }, [chatTabs]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Tab switching logic
  const handleTabSelect = useCallback((tabId: string) => {
    dispatch(setActiveTab(tabId));
  }, [dispatch]);

  // Tab closing logic
  const handleTabClose = useCallback((tabId: string) => {
    const closingTab = chatTabs.find(tab => tab.id === tabId);
    const remainingTabs = chatTabs.filter(tab => tab.id !== tabId);

    dispatch(removeTab(tabId));

    // 활성 탭을 닫는 경우 다른 탭으로 전환
    if (closingTab?.isActive && remainingTabs.length > 0) {
      const nextTab = remainingTabs[0];
      dispatch(setActiveTab(nextTab.id));
    }
  }, [dispatch, chatTabs]);

  // New chat creation
  const handleNewChat = useCallback(() => {
    const newTabId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const newTab: Tab = {
      id: newTabId,
      title: "새 채팅",
      timestamp: Date.now(),
      isActive: true
    };

    dispatch(addTab(newTab));
  }, [dispatch]);

  // History toggle
  const handleToggleHistory = useCallback(() => {
    console.log('ChatContainer: 히스토리 토글 호출됨, 현재 상태:', isHistoryOpen);
    setIsHistoryOpen(prev => {
      const newState = !prev;
      console.log('ChatContainer: 히스토리 상태 변경:', prev, '->', newState);
      return newState;
    });
  }, [isHistoryOpen]);

  // Tab title editing (for tab selector)
  const handleTabTitleEdit = useCallback((tabId: string, newTitle: string) => {
    dispatch(updateTab({
      id: tabId,
      updates: { title: newTitle }
    }));
  }, [dispatch]);

  const activeTab = chatTabs.find(tab => tab.isActive);

  return (
    <Container>
      <ChatActionBar
        onNewChat={handleNewChat}
        onToggleHistory={handleToggleHistory}
        isHistoryOpen={isHistoryOpen}
        tabs={chatTabs}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabTitleEdit={handleTabTitleEdit}
      />

      <ContentArea>
        <ChatContent>
          {activeTab ? (
            <div>
              <h3>활성 채팅: {activeTab.title}</h3>
              <p>채팅 ID: {activeTab.id}</p>
              <p>현재 탭 수: {chatTabs.length}개</p>
              <p>여기에 실제 채팅 메시지가 표시됩니다.</p>
            </div>
          ) : (
            <div>
              <h3>채팅이 없습니다</h3>
              <p>새 채팅을 시작하세요.</p>
            </div>
          )}
        </ChatContent>
      </ContentArea>

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={activeTab?.id}
        onSessionSelect={onSessionSelect}
      />
    </Container>
  );
}