import { IIdeMessenger } from "../context/IdeMessenger";

export interface UserSettings {
  userToken?: string;
  // Additional settings can be added here in the future
  [key: string]: string | undefined;
}

export class SettingsManager {
  private ideMessenger: IIdeMessenger;
  private settingsPath: string;

  constructor(ideMessenger: IIdeMessenger) {
    this.ideMessenger = ideMessenger;
    // Store settings in the workspace directory under .axcode folder
    this.settingsPath = ".axcode/user-settings.json";
  }

  /**
   * Read user settings from JSON file
   * Returns empty object if file doesn't exist or has errors
   */
  async readSettings(): Promise<UserSettings> {
    try {
      const fileExistsResponse = await this.ideMessenger.request("fileExists", {
        filepath: this.settingsPath,
      });

      if (fileExistsResponse.status === "error" || !fileExistsResponse.content) {
        return {};
      }

      const contentResponse = await this.ideMessenger.request("readFile", {
        filepath: this.settingsPath,
      });

      if (contentResponse.status === "error" || !contentResponse.content) {
        return {};
      }

      return JSON.parse(contentResponse.content) as UserSettings;
    } catch (error) {
      console.error("Error reading user settings:", error);
      return {};
    }
  }

  /**
   * Write user settings to JSON file
   * Creates directory structure if it doesn't exist
   */
  async writeSettings(settings: UserSettings): Promise<boolean> {
    try {
      // Ensure the settings are properly formatted JSON
      const jsonContent = JSON.stringify(settings, null, 2);

      const writeResponse = await this.ideMessenger.request("writeFile", {
        path: this.settingsPath,
        contents: jsonContent,
      });

      if (writeResponse.status === "error") {
        console.error("Error writing user settings:", writeResponse.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error writing user settings:", error);
      return false;
    }
  }

  /**
   * Update specific setting
   */
  async updateSetting(key: keyof UserSettings, value: string): Promise<boolean> {
    try {
      const currentSettings = await this.readSettings();
      currentSettings[key] = value;
      return await this.writeSettings(currentSettings);
    } catch (error) {
      console.error("Error updating setting:", error);
      return false;
    }
  }

  /**
   * Get specific setting value
   */
  async getSetting(key: keyof UserSettings): Promise<string | undefined> {
    try {
      const settings = await this.readSettings();
      return settings[key];
    } catch (error) {
      console.error("Error getting setting:", error);
      return undefined;
    }
  }

  /**
   * Delete specific setting
   */
  async deleteSetting(key: keyof UserSettings): Promise<boolean> {
    try {
      const currentSettings = await this.readSettings();
      delete currentSettings[key];
      return await this.writeSettings(currentSettings);
    } catch (error) {
      console.error("Error deleting setting:", error);
      return false;
    }
  }

  /**
   * Clear all settings
   */
  async clearSettings(): Promise<boolean> {
    try {
      return await this.writeSettings({});
    } catch (error) {
      console.error("Error clearing settings:", error);
      return false;
    }
  }
}