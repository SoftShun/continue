import { MagnifyingGlassIcon, XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { SessionMetadata } from "core";
import { formatTimeAgo, formatDateTime, formatTimeAgoFromTimestamp, timeUpdateManager } from "../../util/time";

const SidebarOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

const SidebarContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background-color: var(--vscode-sideBar-background);
  border-left: 1px solid var(--vscode-sideBar-border);
  transform: translateX(${props => props.isOpen ? '0' : '100%'});
  transition: transform 0.2s ease-in-out;
  z-index: 1001;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
  background-color: var(--vscode-editor-background);
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--vscode-icon-foreground);

  &:hover {
    background-color: var(--vscode-toolbar-hoverBackground);
  }
`;

const SearchContainer = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 32px;
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  color: var(--vscode-input-foreground);
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--vscode-focusBorder);
  }

  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
`;

const SearchIcon = styled(MagnifyingGlassIcon)`
  width: 14px;
  height: 14px;
  color: var(--vscode-icon-foreground);
  opacity: 0.6;
`;

const SessionsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const DateGroup = styled.div`
  margin-bottom: 16px;
`;

const DateHeader = styled.div`
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SessionItem = styled.div<{ isActive?: boolean }>`
  padding: 8px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  background-color: ${props =>
    props.isActive ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'
  };
  color: ${props =>
    props.isActive ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'
  };
  border-left-color: ${props =>
    props.isActive ? 'var(--vscode-focusBorder)' : 'transparent'
  };
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
`;

const SessionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SessionTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SessionTime = styled.div`
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
`;

const DeleteButton = styled.button<{ visible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
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
    width: 14px;
    height: 14px;
  }
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
`;

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionMetadata[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
}

interface GroupedSessions {
  [key: string]: SessionMetadata[];
}

function groupSessionsByDate(sessions: SessionMetadata[]): GroupedSessions {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: GroupedSessions = {
    '오늘': [],
    '어제': [],
    '지난 주': [],
    '이전': []
  };

  sessions.forEach(session => {
    const sessionDate = new Date(parseInt(session.dateCreated));
    const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

    if (sessionDateOnly.getTime() === today.getTime()) {
      groups['오늘'].push(session);
    } else if (sessionDateOnly.getTime() === yesterday.getTime()) {
      groups['어제'].push(session);
    } else if (sessionDate.getTime() >= weekAgo.getTime()) {
      groups['지난 주'].push(session);
    } else {
      groups['이전'].push(session);
    }
  });

  // Sort sessions within each group by creation date (latest first)
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    } else {
      groups[key].sort((a, b) => parseInt(b.dateCreated) - parseInt(a.dateCreated));
    }
  });

  return groups;
}

export function HistorySidebar({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete = () => {}
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);

  // 실시간 시간 업데이트
  useEffect(() => {
    const unsubscribe = timeUpdateManager.subscribe(() => {
      setTimeUpdateTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  // Close sidebar when clicking overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle session deletion
  const handleDeleteClick = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection

    // Simple confirmation
    if (window.confirm('이 채팅 기록을 삭제하시겠습니까?')) {
      onSessionDelete(sessionId);
    }
  };

  // Filter sessions based on search query with improved matching
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase().trim();
    return sessions.filter(session => {
      const title = session.title.toLowerCase();

      // Exact match or contains
      if (title.includes(query)) return true;

      // Fuzzy matching - check if all characters in query exist in order
      const queryChars = query.split('');
      let titleIndex = 0;
      let queryIndex = 0;

      while (titleIndex < title.length && queryIndex < queryChars.length) {
        if (title[titleIndex] === queryChars[queryIndex]) {
          queryIndex++;
        }
        titleIndex++;
      }

      return queryIndex === queryChars.length;
    });
  }, [sessions, searchQuery]);

  // Group filtered sessions by date
  const groupedSessions = useMemo(() => {
    return groupSessionsByDate(filteredSessions);
  }, [filteredSessions]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      <SidebarOverlay isOpen={isOpen} onClick={handleOverlayClick} />
      <SidebarContainer isOpen={isOpen}>
        <SidebarHeader>
          <SidebarTitle>History</SidebarTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon width="16" height="16" />
          </CloseButton>
        </SidebarHeader>

        <SearchContainer>
          <div style={{ position: 'relative' }}>
            <SearchInput
              type="text"
              placeholder="채팅 제목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
          </div>
        </SearchContainer>

        <SessionsContainer>
          {Object.keys(groupedSessions).length === 0 ? (
            <EmptyState>
              {searchQuery ? '검색 결과가 없습니다' : '저장된 세션이 없습니다'}
            </EmptyState>
          ) : (
            Object.entries(groupedSessions).map(([dateLabel, groupSessions]) => (
              <DateGroup key={dateLabel}>
                <DateHeader>{dateLabel}</DateHeader>
                {groupSessions.map(session => (
                  <SessionItem
                    key={session.sessionId}
                    isActive={session.sessionId === currentSessionId}
                    onClick={() => onSessionSelect(session.sessionId)}
                    onMouseEnter={() => setHoveredSession(session.sessionId)}
                    onMouseLeave={() => setHoveredSession(null)}
                  >
                    <SessionContent>
                      <SessionTitle title={session.title}>
                        {session.title}
                      </SessionTitle>
                      <SessionTime>
                        {formatTimeAgoFromTimestamp(new Date(session.dateCreated).getTime())}
                      </SessionTime>
                    </SessionContent>

                    <DeleteButton
                      visible={hoveredSession === session.sessionId}
                      onClick={(e) => handleDeleteClick(session.sessionId, e)}
                      title="채팅 삭제"
                    >
                      <TrashIcon />
                    </DeleteButton>
                  </SessionItem>
                ))}
              </DateGroup>
            ))
          )}
        </SessionsContainer>
      </SidebarContainer>
    </>
  );
}