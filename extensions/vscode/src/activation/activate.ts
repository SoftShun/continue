import { getContinueRcPath, getTsConfigPath } from "core/util/paths";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";

import { VsCodeExtension } from "../extension/VsCodeExtension";
import registerQuickFixProvider from "../lang-server/codeActions";
import { getExtensionVersion, isUnsupportedPlatform } from "../util/util";

import { VsCodeContinueApi } from "./api";
import setupInlineTips from "./InlineTipManager";

export async function activateExtension(context: vscode.ExtensionContext) {
  const platformCheck = isUnsupportedPlatform();
  if (platformCheck.isUnsupported) {
    // const platformTarget = `${getPlatform()}-${getArchitecture()}`;
    const platformTarget = "windows-arm64";

    void vscode.window.showInformationMessage(
      `Continue detected that you are using ${platformTarget}. Due to native dependencies, Continue may not be able to start`,
    );

    void Telemetry.capture(
      "unsupported_platform_activation_attempt",
      {
        platform: platformTarget,
        extensionVersion: getExtensionVersion(),
        reason: platformCheck.reason,
      },
      true,
    );
  }

  // Add necessary files
  getTsConfigPath();
  getContinueRcPath();

  // Register commands and providers
  registerQuickFixProvider();
  setupInlineTips(context);

  const vscodeExtension = new VsCodeExtension(context);

  // Load Continue configuration
  if (!context.globalState.get("hasBeenInstalled")) {
    void context.globalState.update("hasBeenInstalled", true);
    void Telemetry.capture(
      "install",
      {
        extensionVersion: getExtensionVersion(),
      },
      true,
    );
  }

  // Register config.yaml schema by removing old entries and adding new one (uri.fsPath changes with each version)
  // Only register if YAML extension is installed
  const yamlExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
  if (yamlExtension) {
    const yamlMatcher = ".skax/**/*.yaml";
    const yamlConfig = vscode.workspace.getConfiguration("yaml");

    const newPath = vscode.Uri.joinPath(
      context.extension.extensionUri,
      "config-yaml-schema.json",
    ).toString();

    try {
      // Check if yaml.schemas configuration exists
      const currentSchemas = yamlConfig.get("schemas") || {};
      const updatedSchemas = { ...currentSchemas, [newPath]: [yamlMatcher] };

      await yamlConfig.update(
        "schemas",
        updatedSchemas,
        vscode.ConfigurationTarget.Global,
      );
      console.log("Successfully registered SKAX config.yaml schema");
    } catch (error) {
      console.warn("Failed to register SKAX config.yaml schema:", error);
    }
  } else {
    console.log("YAML extension not found, skipping schema registration");
  }

  const api = new VsCodeContinueApi(vscodeExtension);
  const continuePublicApi = {
    registerCustomContextProvider: api.registerCustomContextProvider.bind(api),
  };

  // 'export' public api-surface
  // or entire extension for testing
  return process.env.NODE_ENV === "test"
    ? {
        ...continuePublicApi,
        extension: vscodeExtension,
      }
    : continuePublicApi;
}
