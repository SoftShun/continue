import { PencilIcon } from "@heroicons/react/24/outline";
import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";

const SessionTitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 200px;
  flex-shrink: 1;
  min-width: 0;
`;

const SessionTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
`;

const SessionTitleInput = styled.input`
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  color: var(--vscode-input-foreground);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  padding: 4px 8px;
  outline: none;
  min-width: 120px;
  max-width: 200px;

  &:focus {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }

  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: none;
  background: none;
  color: var(--vscode-icon-foreground);
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.15s ease;

  &:hover {
    opacity: 1;
    background-color: var(--vscode-toolbar-hoverBackground);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

interface SessionTitleEditorProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  placeholder?: string;
}

export function SessionTitleEditor({
  title,
  onTitleChange,
  placeholder = "채팅 제목 입력..."
}: SessionTitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleClick = () => {
    setIsEditing(true);
    setEditingTitle(title);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(event.target.value);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      saveTitle();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleInputBlur = () => {
    saveTitle();
  };

  const saveTitle = () => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onTitleChange(trimmedTitle);
    }
    setIsEditing(false);
    setEditingTitle("");
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingTitle("");
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <SessionTitleContainer>
      {isEditing ? (
        <SessionTitleInput
          ref={inputRef}
          value={editingTitle}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder={placeholder}
        />
      ) : (
        <>
          <SessionTitle
            onClick={handleTitleClick}
            title="클릭하여 제목 편집"
          >
            {title}
          </SessionTitle>
          <EditButton
            onClick={handleTitleClick}
            title="제목 편집"
          >
            <PencilIcon />
          </EditButton>
        </>
      )}
    </SessionTitleContainer>
  );
}