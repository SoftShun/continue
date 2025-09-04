import { fetchwithRequestOptions } from "@continuedev/fetch";
import { ChatMessage, IDE, PromptLog } from "..";
import { ConfigHandler } from "../config/ConfigHandler";
import { usesFreeTrialApiKey } from "../config/usesFreeTrialApiKey";
import { FromCoreProtocol, ToCoreProtocol } from "../protocol";
import { IMessenger, Message } from "../protocol/messenger";
import { Telemetry } from "../util/posthog";
import { TTS } from "../util/tts";

export async function* llmStreamChat(
  configHandler: ConfigHandler,
  abortController: AbortController,
  msg: Message<ToCoreProtocol["llm/streamChat"][0]>,
  ide: IDE,
  messenger: IMessenger<ToCoreProtocol, FromCoreProtocol>,
): AsyncGenerator<ChatMessage, PromptLog> {
  const { config } = await configHandler.loadConfig();
  if (!config) {
    throw new Error("Config not loaded");
  }

  // Stop TTS on new StreamChat
  if (config.experimental?.readResponseTTS) {
    void TTS.kill();
  }

  const {
    legacySlashCommandData,
    completionOptions,
    messages,
    messageOptions,
  } = msg.data;

  // Add Continue.dev context identifier if not already present
  const enhancedCompletionOptions = {
    ...completionOptions,
    context: (completionOptions as any).context || "continue.dev",
  };

  console.log("=== CONTINUE.DEV STREAMCHAT DEBUG ===");
  console.log(
    "Original completionOptions:",
    JSON.stringify(
      {
        model: completionOptions.model,
        context: (completionOptions as any).context,
        groupName: completionOptions.groupName,
      },
      null,
      2,
    ),
  );
  console.log(
    "Enhanced completionOptions:",
    JSON.stringify(
      {
        model: enhancedCompletionOptions.model,
        context: (enhancedCompletionOptions as any).context,
        groupName: enhancedCompletionOptions.groupName,
      },
      null,
      2,
    ),
  );
  console.log("=====================================");

  const model = config.selectedModelByRole.chat;

  if (!model) {
    throw new Error("No chat model selected");
  }

  // Note: RAG search is now handled through Context Providers (@rag:groupName)
  // The groupName completion option is maintained for backward compatibility
  let enhancedMessages = messages;

  // Legacy RAG support: If groupName is provided, show deprecation notice
  if (enhancedCompletionOptions.groupName) {
    console.info(
      `Using RAG group: ${completionOptions.groupName} (via Context Provider)`,
    );

    // Still provide the old functionality for backward compatibility
    try {
      const { retrieveContextItemsFromEmbeddings } = await import(
        "../context/retrieval/retrieval"
      );

      const lastUserMessage = messages.filter((m) => m.role === "user").pop();
      if (lastUserMessage) {
        const query =
          typeof lastUserMessage.content === "string"
            ? lastUserMessage.content
            : lastUserMessage.content
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join(" ");

        const contextExtras = {
          config,
          fullInput: query,
          embeddingsProvider: config.selectedModelByRole.embed,
          reranker: config.selectedModelByRole.rerank,
          llm: model,
          ide,
          selectedCode: [],
          fetch: (url: string | URL, init?: any) =>
            fetchwithRequestOptions(url, init, config.requestOptions),
          isInAgentMode: false,
        };

        const contextItems = await retrieveContextItemsFromEmbeddings(
          contextExtras,
          { groupName: enhancedCompletionOptions.groupName },
          undefined,
        );

        if (contextItems.length > 0) {
          const contextContent = contextItems
            .map((item) => `## ${item.name}\n${item.content}`)
            .join("\n\n");

          const contextMessage = {
            role: "system" as const,
            content: `다음은 "${enhancedCompletionOptions.groupName}" 그룹에서 검색된 관련 컨텍스트입니다:\n\n${contextContent}\n\n위의 컨텍스트를 참고하여 사용자 질문에 답변해주세요.`,
          };

          enhancedMessages = [
            ...messages.slice(0, -1),
            contextMessage,
            ...messages.slice(-1),
          ];
        }
      }
    } catch (error) {
      console.warn("Failed to retrieve RAG context:", error);
    }
  }

  // Log to return in case of error
  const errorPromptLog = {
    modelTitle: model?.title ?? model?.model,
    modelProvider: model?.underlyingProviderName ?? "unknown",
    completion: "",
    prompt: "",
    completionOptions: {
      ...enhancedCompletionOptions,
      model: model?.model,
    },
  };

  try {
    if (legacySlashCommandData) {
      const { command, contextItems, historyIndex, input, selectedCode } =
        legacySlashCommandData;
      const slashCommand = config.slashCommands?.find(
        (sc) => sc.name === command.name,
      );
      if (!slashCommand) {
        throw new Error(`Unknown slash command ${command.name}`);
      }
      void Telemetry.capture(
        "useSlashCommand",
        {
          name: command.name,
        },
        true,
      );
      if (!slashCommand.run) {
        console.error(
          `Slash command ${command.name} (${command.source}) has no run function`,
        );
        throw new Error(`Slash command not found`);
      }

      const gen = slashCommand.run({
        input,
        history: enhancedMessages,
        llm: model,
        contextItems,
        params: command.params,
        ide,
        addContextItem: (item) => {
          void messenger.request("addContextItem", {
            item,
            historyIndex,
          });
        },
        selectedCode,
        config,
        fetch: (url, init) =>
          fetchwithRequestOptions(
            url,
            {
              ...init,
              signal: abortController.signal,
            },
            config.requestOptions,
          ),
        completionOptions: enhancedCompletionOptions,
        abortController,
      });
      let next = await gen.next();
      while (!next.done) {
        if (abortController.signal.aborted) {
          next = await gen.return(errorPromptLog);
          break;
        }
        if (next.value) {
          yield {
            role: "assistant",
            content: next.value,
          };
        }
        next = await gen.next();
      }
      if (!next.done) {
        throw new Error("Will never happen");
      }

      return next.value;
    } else {
      const gen = model.streamChat(
        enhancedMessages,
        abortController.signal,
        enhancedCompletionOptions,
        messageOptions,
      );
      let next = await gen.next();
      while (!next.done) {
        if (abortController.signal.aborted) {
          next = await gen.return(errorPromptLog);
          break;
        }

        const chunk = next.value;

        yield chunk;
        next = await gen.next();
      }
      if (config.experimental?.readResponseTTS && "completion" in next.value) {
        void TTS.read(next.value?.completion);
      }

      void Telemetry.capture(
        "chat",
        {
          model: model.model,
          provider: model.providerName,
        },
        true,
      );

      void checkForFreeTrialExceeded(configHandler, messenger);

      if (!next.done) {
        throw new Error("Will never happen");
      }

      return next.value;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("premature close")
    ) {
      void Telemetry.capture(
        "stream_premature_close_error",
        {
          model: model.model,
          provider: model.providerName,
          errorMessage: error.message,
          context: legacySlashCommandData ? "slash_command" : "regular_chat",
          ...(legacySlashCommandData && {
            command: legacySlashCommandData.command.name,
          }),
        },
        false,
      );
    }
    throw error;
  }
}

async function checkForFreeTrialExceeded(
  configHandler: ConfigHandler,
  messenger: IMessenger<ToCoreProtocol, FromCoreProtocol>,
) {
  const { config } = await configHandler.getSerializedConfig();

  // Only check if the user is using the free trial
  if (config && !usesFreeTrialApiKey(config)) {
    return;
  }

  try {
    const freeTrialStatus =
      await configHandler.controlPlaneClient.getFreeTrialStatus();
    if (
      freeTrialStatus &&
      freeTrialStatus.chatCount &&
      freeTrialStatus.chatCount > freeTrialStatus.chatLimit
    ) {
      void messenger.request("freeTrialExceeded", undefined);
    }
  } catch (error) {
    console.error("Error checking free trial status:", error);
  }
}
