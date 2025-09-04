import { createAsyncThunk, unwrapResult } from "@reduxjs/toolkit";
import { ChatMessage } from "core";
import { renderContextItems } from "core/util/messageContent";
import { selectSelectedChatModel } from "../slices/configSlice";
import {
  ChatHistoryItemWithMessageId,
  resetNextCodeBlockToApplyIndex,
  streamUpdate,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";
import { findToolCallById } from "../util";
import { streamNormalInput } from "./streamNormalInput";
import { streamThunkWrapper } from "./streamThunkWrapper";

/**
 * Determines if we should continue streaming based on tool call completion status.
 */
function areAllToolsDoneStreaming(
  assistantMessage: ChatHistoryItemWithMessageId | undefined,
): boolean {
  // This might occur because of race conditions, if so, the tools are completed
  if (!assistantMessage?.toolCallStates) {
    return true;
  }

  // Only continue if all tool calls are complete
  const completedToolCalls = assistantMessage.toolCallStates.filter(
    (tc) => tc.status === "done" || tc.status === "errored",
  );

  return completedToolCalls.length === assistantMessage.toolCallStates.length;
}

/**
 * Checks if we're using an external backend proxy instead of Continue's internal LLM.
 * External backends (like CoE-Backend) need tool results sent back to them,
 * while internal Continue LLMs handle tool results within the same process.
 */
function isUsingExternalBackend(selectedModel: any): boolean {
  if (!selectedModel) {
    return false;
  }

  // Check if model has a custom apiBase that indicates external backend
  const hasCustomApiBase = !!selectedModel.apiBase;

  // Built-in providers that Continue handles internally
  const continueBuiltInProviders = ["continue-proxy", "ollama"];

  // External providers that might have custom backends
  const externalProviders = [
    "openai",
    "anthropic",
    "gemini",
    "bedrock",
    "azure",
    "cohere",
    "watsonx",
  ];

  const providerName = selectedModel.provider;
  const isContinueBuiltIn = continueBuiltInProviders.includes(providerName);
  const isExternalProvider = externalProviders.includes(providerName);

  // External backend if:
  // 1. Has custom apiBase AND is external provider (like custom OpenAI endpoint)
  // 2. OR has custom apiBase and is not a Continue built-in provider
  return hasCustomApiBase && (isExternalProvider || !isContinueBuiltIn);
}

/**
 * Sends tool execution results back to external backend
 * by adding the tool result message to the conversation stream
 */
async function sendToolResultToBackend(
  toolCallId: string,
  toolOutput: any[],
  selectedModel: any,
  dispatch: any,
): Promise<void> {
  try {
    // Create tool result message in Continue's internal format
    const toolResultMessage: ChatMessage = {
      role: "tool",
      content: renderContextItems(toolOutput),
      toolCallId,
    };

    console.log("Adding tool result to conversation for external backend:", {
      apiBase: selectedModel?.apiBase,
      toolCallId,
      contentLength: toolResultMessage.content.length,
    });

    // Add tool result message to the conversation stream
    // This will be included in the next LLM request to the backend
    dispatch(streamUpdate([toolResultMessage]));

    // Allow some time for the message to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("Tool result message added to conversation stream");
  } catch (error) {
    console.error("Failed to add tool result to conversation:", error);
    throw error;
  }
}

export const streamResponseAfterToolCall = createAsyncThunk<
  void,
  { toolCallId: string },
  ThunkApiType
>(
  "chat/streamAfterToolCall",
  async ({ toolCallId }, { dispatch, getState, extra }) => {
    await dispatch(
      streamThunkWrapper(async () => {
        const state = getState();

        const toolCallState = findToolCallById(
          state.session.history,
          toolCallId,
        );

        if (!toolCallState) {
          return; // in cases where edit tool is cancelled mid apply, this will be triggered
        }

        const toolOutput = toolCallState.output ?? [];

        dispatch(resetNextCodeBlockToApplyIndex());
        // await new Promise((resolve) => setTimeout(resolve, 0));

        // Create and dispatch the tool message
        const newMessage: ChatMessage = {
          role: "tool",
          content: renderContextItems(toolOutput),
          toolCallId,
        };
        dispatch(streamUpdate([newMessage]));

        // Check if we should continue streaming based on tool call completion
        const history = getState().session.history;
        const assistantMessage = history.find(
          (item) =>
            item.message.role === "assistant" &&
            item.toolCallStates?.some((tc) => tc.toolCallId === toolCallId),
        );

        if (areAllToolsDoneStreaming(assistantMessage)) {
          const selectedModel = selectSelectedChatModel(getState());

          const isExternal = isUsingExternalBackend(selectedModel);
          console.log("Tool call completion check:", {
            isExternalBackend: isExternal,
            modelProvider: selectedModel?.provider,
            hasApiBase: !!selectedModel?.apiBase,
            apiBase: selectedModel?.apiBase,
            toolCallId,
          });

          if (isExternal) {
            // For external backends, add tool result to conversation stream
            // then continue with normal LLM flow so the backend gets the tool result
            try {
              await sendToolResultToBackend(
                toolCallId,
                toolOutput,
                selectedModel,
                dispatch,
              );

              // After adding tool result to conversation,
              // trigger the normal LLM flow to continue with external backend
              unwrapResult(await dispatch(streamNormalInput({})));
            } catch (error) {
              console.error("Failed to send tool result to backend:", error);
              // Fallback to internal LLM on error
              unwrapResult(await dispatch(streamNormalInput({})));
            }
          } else {
            // For internal Continue LLMs, continue with normal flow
            unwrapResult(await dispatch(streamNormalInput({})));
          }
        }
      }),
    );
  },
);
