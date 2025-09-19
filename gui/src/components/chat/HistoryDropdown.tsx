import { MagnifyingGlassIcon, XMarkIcon, TrashIcon, PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { SessionMetadata } from "core";
import { formatTimeAgoFromTimestamp, timeUpdateManager } from "../../util/time";

const DropdownContainer = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 400px;
  background-color: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column;
  overflow: hidden;
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
  background-color: var(--vscode-editor-background);
`;

const DropdownTitle = styled.h3`
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

  svg {
    width: 16px;
    height: 16px;
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
  max-height: 280px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--vscode-scrollbar-shadow);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground);
  }
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

const ActionButton = styled.button<{ visible: boolean; variant?: 'edit' | 'delete' | 'save' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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
    color: ${props => {
      if (props.variant === 'delete') return 'var(--vscode-errorForeground)';
      if (props.variant === 'save') return 'var(--vscode-charts-green)';
      return 'var(--vscode-icon-foreground)';
    }};
  }

  &:active {
    transform: scale(0.9);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const DeleteButton = ActionButton;
const EditButton = ActionButton;
const SaveButton = ActionButton;

const EditInput = styled.input`
  flex: 1;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-focusBorder);
  border-radius: 3px;
  color: var(--vscode-input-foreground);
  font-size: 13px;
  font-weight: 500;
  padding: 2px 6px;
  margin-right: 8px;
  outline: none;

  &:focus {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

interface HistoryDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionMetadata[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionEdit?: (sessionId: string, newTitle: string) => void;
}

interface GroupedSessions {
  [key: string]: SessionMetadata[];
}

function parseTimestamp(dateCreated: string | number): number {
  if (typeof dateCreated === 'number') return dateCreated;
  if (typeof dateCreated === 'string') {
    const parsed = parseInt(dateCreated);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
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

export function HistoryDropdown({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete = () => {},
  onSessionEdit = () => {}
}: HistoryDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 실시간 시간 업데이트
  useEffect(() => {
    const unsubscribe = timeUpdateManager.subscribe(() => {
      setTimeUpdateTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle session deletion
  const handleDeleteClick = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection
    console.log('🗑️ Delete button clicked for session:', sessionId);

    // Direct deletion (VSCode webview doesn't support window.confirm)
    console.log('🗑️ Proceeding with deletion...');
    onSessionDelete(sessionId);
  };

  // Handle session editing
  const handleEditClick = (sessionId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection
    if (editingTitle.trim()) {
      onSessionEdit(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleEditKeyDown = (event: React.KeyboardEvent, sessionId: string) => {
    if (event.key === 'Enter') {
      handleSaveEdit(sessionId, event as any);
    } else if (event.key === 'Escape') {
      handleCancelEdit();
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

  // Close dropdown on Escape key
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
      <Overlay isOpen={isOpen} onClick={onClose} />
      <DropdownContainer ref={dropdownRef} isOpen={isOpen}>
        <DropdownHeader>
          <DropdownTitle>History</DropdownTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon />
          </CloseButton>
        </DropdownHeader>

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
                    onClick={() => {
                      if (editingSessionId !== session.sessionId) {
                        onSessionSelect(session.sessionId);
                        onClose(); // Close dropdown after selection
                      }
                    }}
                    onMouseEnter={() => setHoveredSession(session.sessionId)}
                    onMouseLeave={() => setHoveredSession(null)}
                  >
                    <SessionContent>
                      {editingSessionId === session.sessionId ? (
                        <EditInput
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, session.sessionId)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <SessionTitle title={session.title}>
                          {session.title}
                        </SessionTitle>
                      )}
                      <SessionTime>
                        {formatTimeAgoFromTimestamp(parseTimestamp(session.dateCreated))}
                      </SessionTime>
                    </SessionContent>

                    <ButtonGroup>
                      {editingSessionId === session.sessionId ? (
                        <SaveButton
                          visible={true}
                          variant="save"
                          onClick={(e) => handleSaveEdit(session.sessionId, e)}
                          title="저장"
                        >
                          <CheckIcon />
                        </SaveButton>
                      ) : (
                        <>
                          <EditButton
                            visible={hoveredSession === session.sessionId}
                            variant="edit"
                            onClick={(e) => handleEditClick(session.sessionId, session.title, e)}
                            title="제목 편집"
                          >
                            <PencilIcon />
                          </EditButton>
                          <DeleteButton
                            visible={hoveredSession === session.sessionId}
                            variant="delete"
                            onClick={(e) => handleDeleteClick(session.sessionId, e)}
                            title="채팅 삭제"
                          >
                            <TrashIcon />
                          </DeleteButton>
                        </>
                      )}
                    </ButtonGroup>
                  </SessionItem>
                ))}
              </DateGroup>
            ))
          )}
        </SessionsContainer>
      </DropdownContainer>
    </>
  );
}