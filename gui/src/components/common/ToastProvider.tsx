import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Toast, ToastManager, ToastProps } from './Toast';

const ToastContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;

  @media (max-width: 480px) {
    left: 0;
    padding: 12px;
  }
`;

export function ToastProvider() {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  useEffect(() => {
    const toastManager = ToastManager.getInstance();

    const unsubscribe = toastManager.subscribe(() => {
      setToasts(toastManager.getToasts());
    });

    return unsubscribe;
  }, []);

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={toast.onClose}
        />
      ))}
    </ToastContainer>
  );
}