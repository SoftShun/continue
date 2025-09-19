import { XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";
import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { SessionMetadata } from "core";
import { formatTimeAgoFromTimestamp, timeUpdateManager } from "../../util/time";

const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  position: relative;
`;

const TabsScrollContainer = styled.div`
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--vscode-scrollbarSlider-background) var(--vscode-scrollbar-shadow);
  flex: 1;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--vscode-scrollbar-shadow);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 4px;
    border: 1px solid var(--vscode-scrollbar-shadow);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground);
  }

  &::-webkit-scrollbar-thumb:active {
    background: var(--vscode-scrollbarSlider-activeBackground);
  }

  /* Smooth scrolling */
  scroll-behavior: smooth;
`;

const TabsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: min-content;
  padding: 0;
`;

const ChatTab = styled.div<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: ${props =>
    props.isActive
      ? 'rgba(212, 168, 83, 0.15)'
      : 'rgba(255, 255, 255, 0.08)'
  };
  color: ${props =>
    props.isActive
      ? '#D4A853'
      : 'var(--vscode-tab-inactiveForeground, #a0a0a0)'
  };
  border: 1px solid ${props =>
    props.isActive
      ? 'rgba(212, 168, 83, 0.3)'
      : 'rgba(255, 255, 255, 0.1)'
  };
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 80px;
  max-width: 140px;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background-color: ${props =>
      props.isActive
        ? 'rgba(212, 168, 83, 0.2)'
        : 'rgba(255, 255, 255, 0.12)'
    };
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
    transition: all 0.1s ease;
  }
`;

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

const TabTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const TabTitleInput = styled.input`
  background: transparent;
  border: 1px solid rgba(212, 168, 83, 0.5);
  border-radius: 3px;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  width: 100%;
  min-width: 0;
  padding: 1px 4px;
  outline: none;
  line-height: 1.2;

  &:focus {
    border-color: rgba(212, 168, 83, 0.8);
    box-shadow: 0 0 0 1px rgba(212, 168, 83, 0.3);
  }
`;

const TabTime = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  margin-top: 1px;
`;

const CloseButton = styled.button<{ visible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: none;
  background: none;
  color: var(--vscode-icon-foreground);
  cursor: pointer;
  opacity: ${props => props.visible ? 1 : 0};
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background-color: var(--vscode-toolbar-hoverBackground);
    color: var(--vscode-errorForeground);
  }

  &:active {
    transform: scale(0.9);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const FadeOverlay = styled.div<{ side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${props => props.side}: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(
    to ${props => props.side === 'left' ? 'right' : 'left'},
    var(--vscode-editor-background),
    transparent
  );
  pointer-events: none;
  z-index: 1;
`;

interface ChatTab {
  id: string;
  title: string;
  timestamp: number;
  isActive: boolean;
}

interface ChatTabsSelectorProps {
  tabs: ChatTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabTitleEdit?: (tabId: string, newTitle: string) => void;
  className?: string;
}

export function ChatTabsSelector({
  tabs,
  onTabSelect,
  onTabClose,
  onTabTitleEdit,
  className
}: ChatTabsSelectorProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [showCloseButton, setShowCloseButton] = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [showFade, setShowFade] = useState({ left: false, right: false });

  const handleTabHover = (tabId: string) => {
    setHoveredTab(tabId);

    // Clear existing timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }

    // Set new timer for 1 second
    const timer = setTimeout(() => {
      setShowCloseButton(tabId);
    }, 1000);

    setHoverTimer(timer);
  };

  const handleTabLeave = () => {
    setHoveredTab(null);
    setShowCloseButton(null);

    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
  };

  const handleTabClick = (tabId: string, event: React.MouseEvent) => {
    event.preventDefault();
    onTabSelect(tabId);
  };

  const handleCloseClick = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTabClose(tabId);
    setShowCloseButton(null);
  };

  const handleTitleDoubleClick = (tabId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTab(tabId);
    setEditingTitle(currentTitle);
  };

  const handleTitleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(event.target.value);
  };

  const handleTitleInputKeyDown = (tabId: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      saveTitle(tabId);
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleTitleInputBlur = (tabId: string) => {
    saveTitle(tabId);
  };

  const saveTitle = (tabId: string) => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== tabs.find(tab => tab.id === tabId)?.title && onTabTitleEdit) {
      onTabTitleEdit(tabId, trimmedTitle);
    }
    setEditingTab(null);
    setEditingTitle("");
  };

  const cancelEdit = () => {
    setEditingTab(null);
    setEditingTitle("");
  };

  const checkScrollOverflow = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowFade({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollOverflow();
    container.addEventListener('scroll', checkScrollOverflow);

    const resizeObserver = new ResizeObserver(checkScrollOverflow);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollOverflow);
      resizeObserver.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    if (editingTab && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTab]);

  // 실시간 시간 업데이트
  useEffect(() => {
    const unsubscribe = timeUpdateManager.subscribe(() => {
      setTimeUpdateTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
    };
  }, [hoverTimer]);

  if (tabs.length === 0) {
    return <TabsContainer className={className} />;
  }

  return (
    <TabsContainer className={className}>
      {showFade.left && <FadeOverlay side="left" />}
      {showFade.right && <FadeOverlay side="right" />}

      <TabsScrollContainer ref={scrollContainerRef}>
        <TabsWrapper>
          {tabs.map((tab) => (
            <ChatTab
              key={tab.id}
              isActive={tab.isActive}
              onMouseEnter={() => handleTabHover(tab.id)}
              onMouseLeave={handleTabLeave}
              onClick={(e) => handleTabClick(tab.id, e)}
            >
              <TabContent>
                {editingTab === tab.id ? (
                  <TabTitleInput
                    ref={editInputRef}
                    value={editingTitle}
                    onChange={handleTitleInputChange}
                    onKeyDown={(e) => handleTitleInputKeyDown(tab.id, e)}
                    onBlur={() => handleTitleInputBlur(tab.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <TabTitle
                    onDoubleClick={(e) => handleTitleDoubleClick(tab.id, tab.title, e)}
                    title="Double-click to edit"
                  >
                    {tab.title || 'New Chat'}
                  </TabTitle>
                )}
                <TabTime>
                  <ClockIcon style={{ width: 8, height: 8 }} />
                  {formatTimeAgoFromTimestamp(tab.timestamp)}
                </TabTime>
              </TabContent>

              <CloseButton
                visible={showCloseButton === tab.id}
                onClick={(e) => handleCloseClick(tab.id, e)}
                title="Close tab"
              >
                <XMarkIcon />
              </CloseButton>
            </ChatTab>
          ))}
        </TabsWrapper>
      </TabsScrollContainer>
    </TabsContainer>
  );
}