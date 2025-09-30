import { ConfigYaml, parseConfigYaml } from "@continuedev/config-yaml";
import {
  ArrowPathIcon,
  CircleStackIcon,
  CommandLineIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  PowerIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { MCPServerStatus } from "core";
import { Fragment, useContext, useMemo } from "react";
import { useAuth } from "../../../../../context/Auth";
import { IdeMessengerContext } from "../../../../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../../../../redux/hooks";
import { updateConfig } from "../../../../../redux/slices/configSlice";
import { fontSize } from "../../../../../util";
import { ToolTip } from "../../../../gui/Tooltip";
import { Button } from "../../../../ui";
import EditBlockButton from "../../EditBlockButton";
import { ExploreBlocksButton } from "../ExploreBlocksButton";

interface MCPServerStatusProps {
  server: MCPServerStatus;
  serverFromYaml?: NonNullable<ConfigYaml["mcpServers"]>[number];
}
function MCPServerPreview({ server, serverFromYaml }: MCPServerStatusProps) {
  const ideMessenger = useContext(IdeMessengerContext);
  const config = useAppSelector((store) => store.config.config);
  const dispatch = useAppDispatch();
  const toolsTooltipId = `${server.id}-tools`;
  const promptsTooltipId = `${server.id}-prompts`;
  const resourcesTooltipId = `${server.id}-resources`;
  const errorsTooltipId = `${server.id}-errors`;
  const mcpAuthTooltipId = `${server.id}-auth`;

  const updateMCPServerStatus = (status: MCPServerStatus["status"]) => {
    // optimistic config update
    dispatch(
      updateConfig({
        ...config,
        mcpServerStatuses: config.mcpServerStatuses.map((s) =>
          s.id === server.id
            ? {
                ...s,
                status,
              }
            : s,
        ),
      }),
    );
  };

  const onAuthenticate = async () => {
    updateMCPServerStatus("authenticating");
    await ideMessenger.request("mcp/startAuthentication", server);
  };

  const onRemoveAuth = async () => {
    updateMCPServerStatus("authenticating");
    await ideMessenger.request("mcp/removeAuthentication", server);
  };

  const onRefresh = async () => {
    updateMCPServerStatus("connecting");
    ideMessenger.post("mcp/reloadServer", {
      id: server.id,
    });
  };

  const onToggle = async () => {
    const newEnabledState = !server.enabled;

    // Optimistic UI update
    dispatch(
      updateConfig({
        ...config,
        mcpServerStatuses: config.mcpServerStatuses.map((s) =>
          s.id === server.id
            ? {
                ...s,
                enabled: newEnabledState,
                status: newEnabledState ? "connecting" : "disabled",
              }
            : s,
        ),
      }),
    );

    try {
      await ideMessenger.request("mcp/toggleServer", { id: server.id });
      console.log("✅ MCP 서버 토글 완료:", server.name);
    } catch (error) {
      console.error("❌ MCP 서버 토글 실패:", error);
      // Revert on error
      dispatch(
        updateConfig({
          ...config,
          mcpServerStatuses: config.mcpServerStatuses.map((s) =>
            s.id === server.id
              ? {
                  ...s,
                  enabled: server.enabled,
                  status: server.status,
                }
              : s,
          ),
        }),
      );
    }
  };

  const onDelete = async () => {
    console.log("🗑️ onDelete 호출됨! server:", server.name);
    try {
      if (server.sourceFile) {
        console.log("📂 sourceFile:", server.sourceFile);

        // Show confirmation dialog
        console.log("⚠️ 확인 대화상자 표시 중...");
        const result = await ideMessenger.ide.showToast(
          "warning",
          `MCP 서버 '${server.name}'을(를) 삭제하시겠습니까?`,
          "삭제",
          "취소",
        );
        console.log("📋 사용자 선택 결과:", result);

        // User cancelled
        if (result !== "삭제") {
          console.log("❌ 사용자가 취소함");
          return;
        }

        // Delete the file
        await ideMessenger.ide.deleteFile(server.sourceFile);
        console.log("✅ MCP 서버 파일 삭제 완료:", server.sourceFile);

        // Update UI by removing from Redux store
        dispatch(
          updateConfig({
            ...config,
            mcpServerStatuses: config.mcpServerStatuses.filter(
              (s) => s.id !== server.id,
            ),
          }),
        );

        await ideMessenger.ide.showToast(
          "info",
          `MCP 서버 '${server.name}'이(가) 삭제되었습니다.`,
        );
      } else {
        console.warn("⚠️ 소스 파일을 찾을 수 없습니다.");
        await ideMessenger.ide.showToast("error", "소스 파일을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("❌ MCP 서버 삭제 실패:", error);
      await ideMessenger.ide.showToast("error", `삭제 실패: ${error}`);
    }
  };

  return (
    <div
      style={{
        fontSize: fontSize(-2),
      }}
      className={`flex flex-row items-center justify-between gap-3 ${
        server.status === "authenticating" ? "my-0.5" : ""
      } ${!server.enabled ? "opacity-50" : ""}`}
    >
      <div className="flex flex-row items-center gap-3">
        {/* Name and Status */}
        <span className={`m-0 font-semibold ${!server.enabled ? "text-gray-400" : ""}`}>
          {server.name}
          {!server.enabled && <span className="ml-1 text-xs">(비활성화됨)</span>}
        </span>

        {/* Error indicator if any */}
        {server.errors.length ? (
          <>
            <InformationCircleIcon
              className={`h-3 w-3 ${server.status === "error" ? "text-red-500" : "text-yellow-500"}`}
              data-tooltip-id={errorsTooltipId}
            />
            <ToolTip
              clickable
              id={errorsTooltipId}
              delayHide={
                server.errors.some((error) => error.length > 150) ? 1500 : 0
              }
              className="flex flex-col gap-0.5"
            >
              {server.errors.map((error, idx) => (
                <Fragment key={idx}>
                  <div>
                    {error.length > 150
                      ? error.substring(0, 150) + "..."
                      : error}
                  </div>
                  {error.length > 150 && (
                    <Button
                      className="my-0"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void ideMessenger.ide.showVirtualFile(
                          server.name,
                          error,
                        )
                      }
                    >
                      View full error
                    </Button>
                  )}
                </Fragment>
              ))}
            </ToolTip>
          </>
        ) : null}

        {/* Tools, Prompts, Resources with counts */}
        <div className="flex flex-row items-center gap-3">
          <div
            className="flex cursor-zoom-in items-center gap-1 hover:opacity-80"
            data-tooltip-id={toolsTooltipId}
          >
            <WrenchScrewdriverIcon className="h-3 w-3" />
            <span className="text-xs">{server.tools.length}</span>
            <ToolTip id={toolsTooltipId} className="flex flex-col gap-0.5">
              {server.tools.map((tool, idx) => (
                <code key={idx}>{tool.name}</code>
              ))}
              {server.tools.length === 0 && (
                <span className="text-lightgray">No tools</span>
              )}
            </ToolTip>
          </div>
          <div
            className="flex cursor-zoom-in items-center gap-1 hover:opacity-80"
            data-tooltip-id={promptsTooltipId}
          >
            <CommandLineIcon className="h-3 w-3" />
            <span className="text-xs">{server.prompts.length}</span>
            <ToolTip id={promptsTooltipId} className="flex flex-col gap-0.5">
              {server.prompts.map((prompt, idx) => (
                <code key={idx}>{prompt.name}</code>
              ))}
              {server.prompts.length === 0 && (
                <span className="text-lightgray">No prompts</span>
              )}
            </ToolTip>
          </div>
          <div
            className="flex cursor-zoom-in items-center gap-1 hover:opacity-80"
            data-tooltip-id={resourcesTooltipId}
          >
            <CircleStackIcon className="h-3 w-3" />
            <span className="text-xs">
              {server.resources.length + server.resourceTemplates.length}
            </span>
            <ToolTip id={resourcesTooltipId} className="flex flex-col gap-0.5">
              {[...server.resources, ...server.resourceTemplates].map(
                (resource, idx) => (
                  <code key={idx}>{resource.name}</code>
                ),
              )}
              {server.resources.length === 0 && (
                <span className="text-lightgray">No resources</span>
              )}
            </ToolTip>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {server.isProtectedResource && (
          <>
            <div
              className="text-lightgray flex cursor-pointer items-center hover:text-white hover:opacity-80"
              data-tooltip-id={
                server.status !== "authenticating" ? mcpAuthTooltipId : ""
              }
            >
              {server.status === "error" ? (
                <ShieldExclamationIcon
                  className="h-3 w-3"
                  onClick={onAuthenticate}
                />
              ) : server.status === "authenticating" ? (
                <GlobeAltIcon className="animate-spin-slow h-3 w-3" />
              ) : (
                <ShieldCheckIcon className="h-3 w-3" onClick={onRemoveAuth} />
              )}
            </div>
            {server.status !== "authenticating" && (
              <ToolTip place="left" id={mcpAuthTooltipId}>
                {server.status === "error" ? "Authenticate" : "Logout"}
              </ToolTip>
            )}
          </>
        )}
        {/* Toggle button */}
        <div
          className={`flex cursor-pointer items-center hover:opacity-80 ${
            server.enabled ? "text-green-500" : "text-gray-500"
          }`}
          onClick={onToggle}
          title={server.enabled ? "서버 비활성화" : "서버 활성화"}
        >
          <PowerIcon className="h-3 w-3" />
        </div>

        {/* Delete button */}
        <div
          className="text-lightgray flex cursor-pointer items-center hover:text-red-500 hover:opacity-80"
          onClick={onDelete}
          title="서버 삭제"
        >
          <TrashIcon className="h-3 w-3" />
        </div>

        <EditBlockButton
          blockType={"mcpServers"}
          block={serverFromYaml}
          sourceFile={server.sourceFile}
        />
        <div
          className="text-lightgray flex cursor-pointer items-center hover:opacity-80"
          onClick={onRefresh}
        >
          <ArrowPathIcon className="h-3 w-3" />
        </div>

        <div
          className="hidden h-2 w-2 rounded-full sm:flex"
          style={{
            backgroundColor: !server.enabled
              ? "#9ca3af" // gray-400 for disabled
              : server.status === "connected"
                ? "#22c55e" // green-500
                : server.status === "connecting"
                  ? "#eab308" // yellow-500
                  : server.status === "not-connected"
                    ? "#78716c" // stone-500
                    : server.status === "disabled"
                      ? "#9ca3af" // gray-400 for disabled
                      : "#ef4444", // red-500 for error
          }}
        />
      </div>
    </div>
  );
}

function MCPSection() {
  const servers = useAppSelector(
    (store) => store.config.config.mcpServerStatuses,
  );
  const { selectedProfile } = useAuth();

  const mergedBlocks = useMemo(() => {
    const parsed = selectedProfile?.rawYaml
      ? parseConfigYaml(selectedProfile?.rawYaml ?? "")
      : undefined;
    return (servers ?? []).map((doc, index) => ({
      block: doc,
      blockFromYaml: parsed?.mcpServers?.[index],
    }));
  }, [servers, selectedProfile]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex max-h-[170px] flex-col gap-1 overflow-y-auto overflow-x-hidden pr-2">
        {mergedBlocks.map(({ block, blockFromYaml }, idx) => (
          <MCPServerPreview
            key={idx}
            server={block}
            serverFromYaml={blockFromYaml}
          />
        ))}
      </div>
      <ExploreBlocksButton blockType="mcpServers" />
    </div>
  );
}

export default MCPSection;
