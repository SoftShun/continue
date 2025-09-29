import { XMarkIcon } from "@heroicons/react/24/outline";
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { SettingsManager, UserSettings } from "../../util/settingsManager";

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContainer = styled.div`
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 8px;
  width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-widget-border);
  background-color: var(--vscode-sideBar-background);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 16px;
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

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 120px);
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-widget-border);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  min-width: 70px;

  ${props => props.variant === 'primary' ? `
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-border, transparent);

    &:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  ` : `
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border-color: var(--vscode-button-border, var(--vscode-widget-border));

    &:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
  `}
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' }>`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;

  ${props => props.type === 'success' ? `
    background-color: var(--vscode-inputValidation-infoBackground);
    color: var(--vscode-inputValidation-infoForeground);
    border: 1px solid var(--vscode-inputValidation-infoBorder);
  ` : `
    background-color: var(--vscode-inputValidation-errorBackground);
    color: var(--vscode-inputValidation-errorForeground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
  `}
`;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [userToken, setUserToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const ideMessenger = useContext(IdeMessengerContext);
  const settingsManager = new SettingsManager(ideMessenger);

  // 모달이 열릴 때 기존 설정 불러오기
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsManager.readSettings();
      setUserToken(settings.userToken || "");
    } catch (error) {
      console.error("설정 불러오기 실패:", error);
      setStatusMessage({ type: 'error', text: '설정을 불러올 수 없습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setStatusMessage(null);

      const settings: UserSettings = {
        userToken: userToken.trim() || undefined,
      };

      const success = await settingsManager.writeSettings(settings);

      if (success) {
        setStatusMessage({ type: 'success', text: '설정이 저장되었습니다.' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
      }
    } catch (error) {
      console.error("설정 저장 실패:", error);
      setStatusMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>사용자 설정</ModalTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <FormGroup>
            <Label htmlFor="userToken">사용자 토큰</Label>
            <Input
              id="userToken"
              type="text"
              placeholder="개인 API 토큰을 입력하세요"
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              disabled={isLoading}
            />
          </FormGroup>

          {statusMessage && (
            <StatusMessage type={statusMessage.type}>
              {statusMessage.text}
            </StatusMessage>
          )}
        </ModalBody>

        <ButtonGroup>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </ModalOverlay>
  );
}