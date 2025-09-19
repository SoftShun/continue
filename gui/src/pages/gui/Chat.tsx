import {
  ArrowLeftIcon,
  ChatBubbleOvalLeftIcon,
} from "@heroicons/react/24/outline";
import { Editor, JSONContent } from "@tiptap/react";
import { ChatHistoryItem, InputModifiers } from "core";
import { renderChatMessage } from "core/util/messageContent";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import styled from "styled-components";
import { Button, lightGray, vscBackground } from "../../components";
import { useFindWidget } from "../../components/find/FindWidget";
import TimelineItem from "../../components/gui/TimelineItem";
import { NewSessionButton } from "../../components/mainInput/belowMainInput/NewSessionButton";
import ThinkingBlockPeek from "../../components/mainInput/belowMainInput/ThinkingBlockPeek";
import SkaxInputBox from "../../components/mainInput/ContinueInputBox";
import { useOnboardingCard } from "../../components/OnboardingCard";
import StepContainer from "../../components/StepContainer";
import { ChatActionBar } from "../../components/chat/ChatActionBar";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useWebviewListener } from "../../hooks/useWebviewListener";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  selectDoneApplyStates,
  selectPendingToolCalls,
} from "../../redux/selectors/selectToolCalls";
import {
  cancelToolCall,
  ChatHistoryItemWithMessageId,
  newSession,
  updateToolCallOutput,
} from "../../redux/slices/sessionSlice";
import { streamEditThunk } from "../../redux/thunks/edit";
import { loadLastSession, refreshSessionMetadata, loadSession, updateSession, deleteSession } from "../../redux/thunks/session";
import { streamResponseThunk } from "../../redux/thunks/streamResponse";
import { isJetBrains, isMetaEquivalentKeyPressed } from "../../util";
import { ToolCallDiv } from "./ToolCallDiv";

import { FatalErrorIndicator } from "../../components/config/FatalErrorNotice";
import InlineErrorMessage from "../../components/mainInput/InlineErrorMessage";
import { cancelStream } from "../../redux/thunks/cancelStream";
import { EmptyChatBody } from "./EmptyChatBody";
import { ExploreDialogWatcher } from "./ExploreDialogWatcher";
import { useAutoScroll } from "./useAutoScroll";

// Helper function to find the index of the latest conversation summary
function findLatestSummaryIndex(history: ChatHistoryItem[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].conversationSummary) {
      return i;
    }
  }
  return -1; // No summary found
}

const StepsDiv = styled.div`
  position: relative;
  background-color: transparent;

  & > * {
    position: relative;
  }

  .thread-message {
    margin: 0 0 0 1px;
  }
`;

export const MAIN_EDITOR_INPUT_ID = "main-editor-input";

function fallbackRender({ error, resetErrorBoundary }: any) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div
      role="alert"
      className="px-2"
      style={{ backgroundColor: vscBackground }}
    >
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
      <pre style={{ color: lightGray }}>{error.stack}</pre>

      <div className="text-center">
        <Button onClick={resetErrorBoundary}>Restart</Button>
      </div>
    </div>
  );
}

export function Chat() {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const onboardingCard = useOnboardingCard();
  const showSessionTabs = useAppSelector(
    (store) => store.config.config.ui?.showSessionTabs,
  );
  const selectedModels = useAppSelector(
    (store) => store.config?.config.selectedModelByRole,
  );
  const isStreaming = useAppSelector((state) => state.session.isStreaming);
  const sessionTitle = useAppSelector((state) => state.session.title);
  const sessionId = useAppSelector((state) => state.session.id);
  const sessionMetadata = useAppSelector((state) =>
    state.session.allSessionMetadata?.find(s => s.sessionId === sessionId)
  );
  const allSessionMetadata = useAppSelector((state) => state.session.allSessionMetadata || []);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Chat tabs state - only show tabs for sessions with messages
  const [chatTabs, setChatTabs] = useState<Array<{
    id: string;
    title: string;
    timestamp: number;
    isActive: boolean;
  }>>([]);
  const [stepsOpen] = useState<(boolean | undefined)[]>([]);
  const mainTextInputRef = useRef<HTMLInputElement>(null);
  const stepsDivRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const history = useAppSelector((state) => state.session.history);
  const showChatScrollbar = useAppSelector(
    (state) => state.config.config.ui?.showChatScrollbar,
  );
  const codeToEdit = useAppSelector((state) => state.editModeState.codeToEdit);
  const mode = useAppSelector((store) => store.session.mode);
  const isInEdit = useAppSelector((store) => store.session.isInEdit);

  const lastSessionId = useAppSelector((state) => state.session.lastSessionId);
  const hasDismissedExploreDialog = useAppSelector(
    (state) => state.ui.hasDismissedExploreDialog,
  );
  const jetbrains = useMemo(() => {
    return isJetBrains();
  }, []);

  useAutoScroll(stepsDivRef, history);

  useEffect(() => {
    // Cmd + Backspace to delete current step
    const listener = (e: KeyboardEvent) => {
      if (
        e.key === "Backspace" &&
        (jetbrains ? e.altKey : isMetaEquivalentKeyPressed(e)) &&
        !e.shiftKey
      ) {
        void dispatch(cancelStream());
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [isStreaming, jetbrains, isInEdit]);

  const { widget, highlights } = useFindWidget(
    stepsDivRef,
    tabsRef,
    isStreaming,
  );

  // Create tab when first message is sent to a new session
  useEffect(() => {
    console.log('🔍 Tab creation useEffect triggered:', {
      historyLength: history.length,
      sessionId,
      currentTabsCount: chatTabs.length,
      currentTabs: chatTabs.map(t => ({ id: t.id, title: t.title }))
    });

    if (history.length > 0 && sessionId) {
      setChatTabs(prevTabs => {
        // 강력한 중복 방지: 동일한 sessionId 탭이 이미 존재하는지 확인
        const existingTab = prevTabs.find(tab => tab.id === sessionId);

        console.log('🔍 Tab existence check:', {
          sessionId,
          existingTab: existingTab ? { id: existingTab.id, title: existingTab.title } : null,
          currentTabs: prevTabs.map(t => ({ id: t.id, title: t.title }))
        });

        if (!existingTab) {
          // 새 탭 생성
          const newTabNumber = prevTabs.length + 1;
          const autoTitle = `Chat ${newTabNumber}`;

          console.log('🆕 Creating new tab:', {
            sessionId,
            autoTitle,
            newTabNumber
          });

          return [
            ...prevTabs.map(tab => ({ ...tab, isActive: false })),
            {
              id: sessionId,
              title: autoTitle,
              timestamp: Date.now(),
              isActive: true
            }
          ];
        } else {
          // 기존 탭 활성화만 처리
          const needsActivation = !existingTab.isActive || prevTabs.some(tab => tab.id !== sessionId && tab.isActive);

          console.log('🔍 Tab activation update:', {
            sessionId,
            needsActivation,
            currentActiveTab: prevTabs.find(t => t.isActive)?.id
          });

          if (!needsActivation) return prevTabs;

          return prevTabs.map(tab => ({
            ...tab,
            isActive: tab.id === sessionId
          }));
        }
      });
    }
  }, [history.length, sessionId]); // sessionTitle 의존성 제거

  // 별도의 useEffect로 제목 업데이트 처리
  useEffect(() => {
    if (sessionTitle && sessionId) {
      console.log('🔍 Title update useEffect triggered:', {
        sessionId,
        sessionTitle
      });

      setChatTabs(prevTabs => {
        const targetTab = prevTabs.find(tab => tab.id === sessionId);

        // 탭이 존재하고 제목이 다른 경우에만 업데이트
        const shouldUpdateTitle = targetTab && targetTab.title !== sessionTitle;

        console.log('🔍 Title update check:', {
          sessionId,
          targetTab: targetTab ? { id: targetTab.id, title: targetTab.title } : null,
          shouldUpdateTitle,
          newTitle: sessionTitle
        });

        if (shouldUpdateTitle) {
          console.log('📝 Updating tab title:', {
            sessionId,
            oldTitle: targetTab.title,
            newTitle: sessionTitle
          });

          return prevTabs.map(tab =>
            tab.id === sessionId
              ? { ...tab, title: sessionTitle }
              : tab
          );
        }
        return prevTabs;
      });
    }
  }, [sessionTitle, sessionId]);

  const pendingToolCalls = useAppSelector(selectPendingToolCalls);
  const pendingApplyStates = useAppSelector(selectDoneApplyStates);

  const sendInput = useCallback(
    (
      editorState: JSONContent,
      modifiers: InputModifiers,
      index?: number,
      editorToClearOnSend?: Editor,
    ) => {
      // Cancel all pending tool calls
      pendingToolCalls.forEach((toolCallState) => {
        dispatch(
          cancelToolCall({
            toolCallId: toolCallState.toolCallId,
          }),
        );
      });

      // Reject all pending apply states
      pendingApplyStates.forEach((applyState) => {
        if (applyState.status !== "closed") {
          ideMessenger.post("rejectDiff", applyState);
        }
      });
      const model = isInEdit
        ? (selectedModels?.edit ?? selectedModels?.chat)
        : selectedModels?.chat;
      if (!model) {
        return;
      }

      if (isInEdit && codeToEdit.length === 0) {
        return;
      }

      // TODO - hook up with hub to detect free trial progress
      // if (model.provider === "free-trial") {
      //   const newCount = incrementFreeTrialCount();

      //   if (newCount === FREE_TRIAL_LIMIT_REQUESTS) {
      //     posthog?.capture("ftc_reached");
      //   }
      //   if (newCount >= FREE_TRIAL_LIMIT_REQUESTS) {
      //     // Show this message whether using platform or not
      //     // So that something happens if in new chat
      //     void ideMessenger.ide.showToast(
      //       "error",
      //       "You've reached the free trial limit. Please configure a model to continue.",
      //     );

      //     // If history, show the dialog, which will automatically close if there is not history
      //     if (history.length) {
      //       dispatch(setDialogMessage(<FreeTrialOverDialog />));
      //       dispatch(setShowDialog(true));
      //     }
      //     return;
      //   }
      // }

      if (isInEdit) {
        void dispatch(
          streamEditThunk({
            editorState,
            codeToEdit,
          }),
        );
      } else {
        void dispatch(streamResponseThunk({ editorState, modifiers, index }));

        if (editorToClearOnSend) {
          editorToClearOnSend.commands.clearContent();
        }
      }
    },
    [
      history,
      selectedModels,
      mode,
      isInEdit,
      codeToEdit,
      pendingToolCalls,
      pendingApplyStates,
    ],
  );

  useWebviewListener(
    "newSession",
    async () => {
      // unwrapResult(response) // errors if session creation failed
      mainTextInputRef.current?.focus?.();
    },
    [mainTextInputRef],
  );

  // Handle partial tool call output for streaming updates
  useWebviewListener(
    "toolCallPartialOutput",
    async (data) => {
      // Update tool call output in Redux store
      dispatch(
        updateToolCallOutput({
          toolCallId: data.toolCallId,
          contextItems: data.contextItems,
        }),
      );
    },
    [dispatch],
  );

  const isLastUserInput = useCallback(
    (index: number): boolean => {
      return !history
        .slice(index + 1)
        .some((entry) => entry.message.role === "user");
    },
    [history],
  );

  const renderChatHistoryItem = useCallback(
    (item: ChatHistoryItemWithMessageId, index: number) => {
      const {
        message,
        editorState,
        contextItems,
        appliedRules,
        toolCallStates,
      } = item;

      // Calculate once for the entire function
      const latestSummaryIndex = findLatestSummaryIndex(history);
      const isBeforeLatestSummary =
        latestSummaryIndex !== -1 && index < latestSummaryIndex;

      if (message.role === "user") {
        return (
          <div className={isBeforeLatestSummary ? "opacity-50" : ""}>
            <SkaxInputBox
              onEnter={(editorState, modifiers) =>
                sendInput(editorState, modifiers, index)
              }
              isLastUserInput={isLastUserInput(index)}
              isMainInput={false}
              editorState={editorState}
              contextItems={contextItems}
              appliedRules={appliedRules}
              inputId={message.id}
            />
          </div>
        );
      }

      if (message.role === "tool") {
        return null;
      }

      if (message.role === "assistant") {
        return (
          <>
            {/* Always render assistant content through normal path */}
            <div className="thread-message">
              <TimelineItem
                item={item}
                iconElement={
                  <ChatBubbleOvalLeftIcon width="16px" height="16px" />
                }
                open={
                  typeof stepsOpen[index] === "undefined"
                    ? true
                    : stepsOpen[index]!
                }
                onToggle={() => {}}
              >
                <StepContainer
                  index={index}
                  isLast={index === history.length - 1}
                  item={item}
                  latestSummaryIndex={latestSummaryIndex}
                />
              </TimelineItem>
            </div>

            {toolCallStates && (
              <ToolCallDiv
                toolCallStates={toolCallStates}
                historyIndex={index}
              />
            )}
          </>
        );
      }

      if (message.role === "thinking") {
        return (
          <div className={isBeforeLatestSummary ? "opacity-50" : ""}>
            <ThinkingBlockPeek
              content={renderChatMessage(message)}
              redactedThinking={message.redactedThinking}
              index={index}
              prevItem={index > 0 ? history[index - 1] : null}
              inProgress={index === history.length - 1}
              signature={message.signature}
            />
          </div>
        );
      }

      // Default case - regular assistant message
      return (
        <div className="thread-message">
          <TimelineItem
            item={item}
            iconElement={<ChatBubbleOvalLeftIcon width="16px" height="16px" />}
            open={
              typeof stepsOpen[index] === "undefined" ? true : stepsOpen[index]!
            }
            onToggle={() => {}}
          >
            <StepContainer
              index={index}
              isLast={index === history.length - 1}
              item={item}
              latestSummaryIndex={latestSummaryIndex}
            />
          </TimelineItem>
        </div>
      );
    },
    [sendInput, isLastUserInput, history, stepsOpen],
  );

  const handleNewChat = useCallback(() => {
    dispatch(newSession());
  }, [dispatch]);

  const handleToggleHistory = useCallback(() => {
    if (!isHistoryOpen) {
      // Refresh session metadata when opening history
      dispatch(refreshSessionMetadata({}));
    }
    setIsHistoryOpen(prev => !prev);
  }, [dispatch, isHistoryOpen]);

  // Tab handlers
  const handleTabSelect = useCallback((tabId: string) => {
    if (tabId !== sessionId) {
      dispatch(loadSession({ sessionId: tabId, saveCurrentSession: true }));
    }
  }, [dispatch, sessionId]);

  const handleTabClose = useCallback((tabId: string) => {
    // Remove tab from state
    setChatTabs(prevTabs => {
      const remainingTabs = prevTabs.filter(tab => tab.id !== tabId);

      // If closing current session, switch to another or create new
      if (tabId === sessionId && remainingTabs.length > 0) {
        dispatch(loadSession({ sessionId: remainingTabs[0].id, saveCurrentSession: false }));
      } else if (remainingTabs.length === 0) {
        dispatch(newSession());
      }

      return remainingTabs;
    });
  }, [dispatch, sessionId]);

  // Session deletion handler
  const handleSessionDelete = useCallback((sessionId: string) => {
    console.log('🗑️ Chat.tsx handleSessionDelete called for session:', sessionId);

    // Delete the session from backend and update UI
    console.log('🗑️ Dispatching deleteSession thunk...');
    dispatch(deleteSession(sessionId));

    // Remove tab from local state
    console.log('🗑️ Removing tab from local state...');
    setChatTabs(prevTabs => prevTabs.filter(tab => tab.id !== sessionId));
  }, [dispatch]);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (sessionId && newTitle && newTitle !== sessionTitle) {
      const session = {
        sessionId,
        title: newTitle,
        workspaceDirectory: window.workspacePaths?.[0] || "",
        history
      };
      await dispatch(updateSession(session));
    }
  }, [dispatch, sessionId, sessionTitle, history]);

  const handleSessionEdit = useCallback(async (editSessionId: string, newTitle: string) => {
    // Update session title using the existing handleTitleChange logic
    // But we need to temporarily switch to the session to update it
    if (editSessionId !== sessionId) {
      // For now, just log the edit - in a full implementation,
      // this would update the session metadata directly
      console.log('Editing session:', editSessionId, 'to:', newTitle);
    } else {
      // If editing current session, use existing handler
      await handleTitleChange(newTitle);
    }
  }, [sessionId, handleTitleChange]);

  const handleTabTitleEdit = useCallback(async (tabId: string, newTitle: string) => {
    // Update the tab title in chat tabs state
    setChatTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, title: newTitle }
          : tab
      )
    );

    // If editing the current session, also update session data
    if (tabId === sessionId) {
      await handleTitleChange(newTitle);
    }
  }, [sessionId, handleTitleChange]);

  const handleSessionSelect = useCallback(async (selectedSessionId: string) => {
    setIsHistoryOpen(false);
    if (selectedSessionId !== sessionId) {
      await dispatch(loadSession({
        sessionId: selectedSessionId,
        saveCurrentSession: true
      }));
    }
  }, [dispatch, sessionId]);

  const handleCloseSidebar = useCallback(() => {
    setIsHistoryOpen(false);
  }, []);

  const showScrollbar = showChatScrollbar ?? window.innerHeight > 5000;

  return (
    <>
      <ChatActionBar
        onNewChat={handleNewChat}
        onToggleHistory={handleToggleHistory}
        isHistoryOpen={isHistoryOpen}
        tabs={chatTabs}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabTitleEdit={handleTabTitleEdit}
        sessions={allSessionMetadata}
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onSessionEdit={handleSessionEdit}
      />
      {widget}

      <StepsDiv
        ref={stepsDivRef}
        className={`overflow-y-scroll pt-[8px] ${showScrollbar ? "thin-scrollbar" : "no-scrollbar"} ${history.length > 0 ? "flex-1" : ""}`}
      >
        {highlights}
        {history.map((item, index: number) => (
          <ErrorBoundary
            key={item.message.id}
            FallbackComponent={fallbackRender}
            onReset={() => {
              dispatch(newSession());
            }}
          >
            <div
              style={{
                minHeight: index === history.length - 1 ? "200px" : 0,
              }}
            >
              {renderChatHistoryItem(item, index)}
              {index === history.length - 1 && <InlineErrorMessage />}
            </div>
          </ErrorBoundary>
        ))}
      </StepsDiv>
      <div className="relative">
        <SkaxInputBox
          isMainInput
          isLastUserInput={false}
          onEnter={(editorState, modifiers, editor) =>
            sendInput(editorState, modifiers, undefined, editor)
          }
          inputId={MAIN_EDITOR_INPUT_ID}
        />

        <div
          className="flex flex-row items-center justify-between pb-1 pl-0.5 pr-2"
          style={{
            pointerEvents: isStreaming ? "none" : "auto",
          }}
        >
          <div className="xs:inline hidden">
            {history.length === 0 && lastSessionId && !isInEdit && (
              <NewSessionButton
                onClick={async () => {
                  await dispatch(
                    loadLastSession({
                      saveCurrentSession: true,
                    }),
                  );
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                <span className="text-xs">Last Session</span>
              </NewSessionButton>
            )}
          </div>
        </div>

        <FatalErrorIndicator />
        {!hasDismissedExploreDialog && <ExploreDialogWatcher />}
        {history.length === 0 && (
          <EmptyChatBody showOnboardingCard={onboardingCard.show} />
        )}
      </div>

    </>
  );
}
