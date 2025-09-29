import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// ============ 토스트 애니메이션 ============
const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// ============ 토스트 컨테이너 ============
const ToastContainer = styled.div<{ $type: ToastType; $isVisible: boolean }>`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  min-width: 320px;
  max-width: 480px;

  /* Glassmorphism 효과 */
  background: rgba(var(--vscode-editor-background-rgb, 30, 30, 30), 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  /* 테두리 및 그림자 */
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'info': return 'rgba(59, 130, 246, 0.3)';
      default: return 'rgba(var(--vscode-widget-border-rgb, 128, 128, 128), 0.3)';
    }
  }};

  border-radius: 12px;
  padding: 16px;

  /* 그림자 */
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);

  /* 애니메이션 */
  animation: ${props => props.$isVisible ? slideInRight : slideOutRight} 300ms ease-out;

  /* 반응형 */
  @media (max-width: 480px) {
    left: 12px;
    right: 12px;
    min-width: auto;
    max-width: none;
  }
`;

const ToastContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const ToastIcon = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'info': return '#3b82f6';
      default: return 'var(--vscode-editor-foreground)';
    }
  }};
`;

const ToastText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ToastTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
`;

const ToastMessage = styled.div`
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  font-family: var(--vscode-font-family);
  line-height: 1.4;
`;

// ============ 타입 정의 ============
export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

// ============ 토스트 컴포넌트 ============
export function Toast({ type, title, message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 애니메이션 완료 후 컴포넌트 제거
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6" />;
      default:
        return <InformationCircleIcon className="w-6 h-6" />;
    }
  };

  return (
    <ToastContainer $type={type} $isVisible={isVisible}>
      <ToastContent>
        <ToastIcon $type={type}>
          {getIcon()}
        </ToastIcon>
        <ToastText>
          <ToastTitle>{title}</ToastTitle>
          {message && <ToastMessage>{message}</ToastMessage>}
        </ToastText>
      </ToastContent>
    </ToastContainer>
  );
}

// ============ 토스트 매니저 ============
export class ToastManager {
  private static instance: ToastManager;
  private toasts: Map<string, ToastProps & { id: string }> = new Map();
  private listeners: Set<() => void> = new Set();

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(props: Omit<ToastProps, 'onClose'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.toasts.set(id, {
      ...props,
      id,
      onClose: () => this.remove(id)
    });
    this.notifyListeners();
    return id;
  }

  remove(id: string): void {
    this.toasts.delete(id);
    this.notifyListeners();
  }

  success(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'error', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'info', title, message, duration });
  }

  getToasts(): Array<ToastProps & { id: string }> {
    return Array.from(this.toasts.values());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// 전역 토스트 매니저 인스턴스
export const toast = ToastManager.getInstance();