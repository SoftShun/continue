import React, { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import styled, { keyframes, css } from "styled-components";
import { AxcodeSettings } from "../../services/settingsService";
import { toast } from "../common/Toast";

// ============ 2025 모던 애니메이션 ============
const fadeIn = keyframes`
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(20px);
  }
`;

const slideInScale = keyframes`
  from {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// ============ Glassmorphism 오버레이 ============
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 300ms ease-out;
  transition: backdrop-filter 200ms ease;
`;

// ============ 모던 모달 컨테이너 ============
const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  /* Glassmorphism 효과 */
  background: rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  /* 모던 보더와 그림자 */
  border: 1px solid rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.3);
  border-radius: 16px;

  /* 크기 및 제약 */
  width: 90vw;
  max-width: 480px;
  min-width: 320px;
  max-height: 85vh;

  /* 애니메이션 */
  animation: ${slideInScale} 400ms cubic-bezier(0.34, 1.56, 0.64, 1);

  /* 고급 그림자 효과 */
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.4),
    0 12px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  /* 반응형 최적화 */
  @media (max-width: 400px) {
    width: 95vw;
    min-width: 280px;
    border-radius: 12px;
  }

  @media (max-width: 600px) {
    width: 88vw;
    max-width: 420px;
  }
`;

// ============ 헤더 영역 ============
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.2);
  background: linear-gradient(135deg,
    rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.8),
    rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.6)
  );
  border-radius: 16px 16px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  letter-spacing: -0.02em;
`;

// ============ 모던 닫기 버튼 ============
const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(var(--vscode-button-background-rgb, 94, 94, 94), 0.1);
  color: var(--vscode-editor-foreground);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 200ms ease, height 200ms ease;
  }

  &:hover {
    background: rgba(var(--vscode-button-hoverBackground-rgb, 108, 108, 108), 0.2);
    transform: scale(1.05);

    &::before {
      width: 40px;
      height: 40px;
    }
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
`;

// ============ 바디 영역 ============
const ModalBody = styled.div`
  padding: 32px 24px;
  background: rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.8);
  max-height: calc(85vh - 140px);
  overflow-y: auto;

  /* 커스텀 스크롤바 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(var(--vscode-scrollbarSlider-background-rgb, 121, 121, 121), 0.4);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--vscode-scrollbarSlider-hoverBackground-rgb, 100, 100, 100), 0.6);
  }
`;

// ============ 폼 그룹 ============
const FormGroup = styled.div`
  margin-bottom: 28px;
  position: relative;
`;

// ============ 모던 라벨 (Floating Label) ============
const Label = styled.label<{ $hasValue: boolean; $focused: boolean }>`
  position: absolute;
  left: 14px;
  color: var(--vscode-input-placeholderForeground);
  font-size: ${props => props.$hasValue || props.$focused ? '12px' : '14px'};
  font-weight: 500;
  font-family: var(--vscode-font-family);
  pointer-events: none;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left top;

  top: ${props => props.$hasValue || props.$focused ? '8px' : '50%'};
  transform: ${props =>
    props.$hasValue || props.$focused
      ? 'translateY(0) scale(0.9)'
      : 'translateY(-50%)'
  };

  color: ${props =>
    props.$focused
      ? 'var(--vscode-focusBorder)'
      : 'var(--vscode-input-placeholderForeground)'
  };
`;

// ============ 모던 입력 필드 ============
const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input<{ $hasValue: boolean; $focused: boolean; $hasError?: boolean }>`
  width: 100%;
  padding: 20px 14px 12px;
  border: 2px solid rgba(var(--vscode-input-border-rgb, 128, 128, 128), 0.3);
  border-radius: 12px;
  background: rgba(var(--vscode-input-background-rgb, 60, 60, 60), 0.8);
  color: var(--vscode-input-foreground);
  font-size: 14px;
  font-family: var(--vscode-font-family);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  /* Glassmorphism 효과 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  /* 포커스 및 에러 상태 */
  border-color: ${props => {
    if (props.$hasError) return 'rgba(239, 68, 68, 0.6)';
    if (props.$focused) return 'var(--vscode-focusBorder)';
    return 'rgba(var(--vscode-input-border-rgb, 128, 128, 128), 0.3)';
  }};

  box-shadow: ${props => {
    if (props.$hasError) return '0 0 0 3px rgba(239, 68, 68, 0.1)';
    if (props.$focused) return '0 0 0 3px rgba(var(--vscode-focusBorder-rgb, 0, 122, 255), 0.1)';
    return 'none';
  }};

  &:hover:not(:focus) {
    border-color: rgba(var(--vscode-input-border-rgb, 128, 128, 128), 0.5);
  }
`;

// ============ 비밀번호 토글 버튼 ============
const PasswordToggle = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--vscode-input-placeholderForeground);
  cursor: pointer;
  border-radius: 4px;
  transition: all 150ms ease;

  &:hover {
    color: var(--vscode-input-foreground);
    background: rgba(var(--vscode-button-background-rgb, 94, 94, 94), 0.1);
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }
`;

// ============ 버튼 컨테이너 ============
const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.2);
  background: linear-gradient(135deg,
    rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.8),
    rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.6)
  );
  border-radius: 0 0 16px 16px;
`;

// ============ 모던 버튼 ============
const Button = styled.button<{ $variant?: 'primary' | 'secondary'; $loading?: boolean }>`
  padding: 12px 24px;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--vscode-font-family);
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 100px;
  position: relative;
  overflow: hidden;
  letter-spacing: -0.01em;

  /* Ripple 효과를 위한 가상 요소 */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:active::before {
    width: 300px;
    height: 300px;
  }

  /* 로딩 상태 */
  ${props => props.$loading && css`
    cursor: not-allowed;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      animation: ${shimmer} 1.5s infinite;
    }
  `}

  /* 변형별 스타일 */
  ${({ $variant = 'secondary' }) =>
    $variant === 'primary'
      ? css`
          background: linear-gradient(135deg,
            var(--vscode-button-background),
            rgba(var(--vscode-button-background-rgb, 0, 122, 255), 0.8)
          );
          color: var(--vscode-button-foreground);
          border-color: var(--vscode-button-background);

          &:hover:not(:disabled) {
            background: linear-gradient(135deg,
              var(--vscode-button-hoverBackground),
              var(--vscode-button-background)
            );
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(var(--vscode-button-background-rgb, 0, 122, 255), 0.3);
          }

          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `
      : css`
          background: rgba(var(--vscode-button-secondaryBackground-rgb, 94, 94, 94), 0.1);
          color: var(--vscode-button-secondaryForeground);
          border-color: rgba(var(--vscode-button-border-rgb, 128, 128, 128), 0.3);

          &:hover:not(:disabled) {
            background: rgba(var(--vscode-button-secondaryHoverBackground-rgb, 108, 108, 108), 0.2);
            border-color: rgba(var(--vscode-button-border-rgb, 128, 128, 128), 0.5);
            transform: translateY(-1px);
          }

          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `}

  &:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

// ============ 에러 메시지 ============
const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #ef4444;
  font-family: var(--vscode-font-family);

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

// ============ 상태 메시지 컴포넌트 ============
const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--vscode-font-family);
  transition: all 250ms ease;
  animation: ${slideInScale} 300ms ease-out;

  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #22c55e;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
        `;
      case 'info':
        return css`
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        `;
      default:
        return css`
          background: rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.1);
          border: 1px solid rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.2);
          color: var(--vscode-editor-foreground);
        `;
    }
  }}

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

// ============ 인터페이스 정의 ============
interface ModernSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: Partial<AxcodeSettings>) => Promise<boolean>;
  initialSettings?: Partial<AxcodeSettings>;
}

export function ModernSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings
}: ModernSettingsModalProps) {
  const [personalToken, setPersonalToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // 메시지 상태 추가
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');

  // 초기값 설정
  useEffect(() => {
    if (isOpen && initialSettings?.personalToken) {
      setPersonalToken(initialSettings.personalToken);
    }
    // 모달이 열릴 때마다 메시지 상태 초기화
    if (isOpen) {
      setMessage('');
      setMessageType('');
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 입력 유효성 검사 함수
  const validateInput = () => {
    if (!personalToken.trim()) {
      return '개인 토큰을 입력해주세요.';
    }
    if (personalToken.trim().length < 10) {
      return '개인 토큰은 최소 10자 이상이어야 합니다.';
    }
    return '';
  };

  const handleSave = async () => {
    if (!onSave) return;

    setHasAttemptedSave(true);
    const error = validateInput();
    setValidationError(error);

    if (error) {
      console.error('입력 확인 필요:', error);
      // 이미 validationError로 표시되고 있으므로 중복 메시지 방지
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSave({ personalToken: personalToken.trim() });
      if (success) {
        console.log('설정 저장 완료: 개인 토큰이 성공적으로 저장되었습니다.');
        setValidationError(''); // validation 에러 메시지 클리어
        setMessage('개인 토큰이 성공적으로 저장되었습니다!');
        setMessageType('success');
        setTimeout(() => {
          onClose();
        }, 1500); // 1.5초 후 모달 닫기
      } else {
        console.error('저장 실패: 설정을 저장하는 중 오류가 발생했습니다.');
        setMessage('설정을 저장하는 중 오류가 발생했습니다.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage('저장 중 오류가 발생했습니다: ' + error);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const hasValue = personalToken.length > 0;

  return (
    <ModalOverlay onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>개인 토큰</ModalTitle>
          <CloseButton onClick={onClose} disabled={isLoading}>
            <XMarkIcon className="w-5 h-5" />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <FormGroup>
            <InputContainer>
              <Label
                htmlFor="personal-token"
                $hasValue={hasValue}
                $focused={isFocused}
              >
                개인 토큰
              </Label>
              <Input
                id="personal-token"
                type={showPassword ? "text" : "password"}
                value={personalToken}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setPersonalToken(newValue);
                  // 입력 중 에러 상태 초기화
                  if (hasAttemptedSave && validationError) {
                    // 실시간 유효성 검사
                    let error = '';
                    if (!newValue.trim()) {
                      error = '개인 토큰을 입력해주세요.';
                    } else if (newValue.trim().length < 10) {
                      error = '개인 토큰은 최소 10자 이상이어야 합니다.';
                    }
                    setValidationError(error);
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                $hasValue={hasValue}
                $focused={isFocused}
                $hasError={hasAttemptedSave && !!validationError}
                disabled={isLoading}
              />
              <PasswordToggle
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                title={showPassword ? "토큰 숨기기" : "토큰 보기"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </PasswordToggle>
            </InputContainer>
            {hasAttemptedSave && validationError && (
              <ErrorMessage>
                <ExclamationTriangleIcon />
                {validationError}
              </ErrorMessage>
            )}
          </FormGroup>

          {/* 상태 메시지 표시 */}
          {message && messageType && (
            <StatusMessage $type={messageType}>
              {messageType === 'success' && <CheckCircleIcon />}
              {messageType === 'error' && <ExclamationTriangleIcon />}
              {messageType === 'info' && <InformationCircleIcon />}
              {message}
            </StatusMessage>
          )}
        </ModalBody>

        <ButtonContainer>
          <Button
            $variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            $variant="primary"
            onClick={handleSave}
            disabled={isLoading}
            $loading={isLoading}
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </ButtonContainer>
      </ModalContainer>
    </ModalOverlay>
  );
}