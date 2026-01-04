/**
 * Shell API
 *
 * Tauri-native shell command execution using @tauri-apps/plugin-shell
 */

import { Command, Shell as TauriShell } from '@tauri-apps/plugin-shell';

export interface ShellCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface ShellCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Shell API class wrapping Tauri shell plugin
 */
export class Shell {
  /**
   * Execute shell command and get output
   */
  static async execute(
    command: string,
    args?: string[],
    options?: ShellCommandOptions,
  ): Promise<ShellCommandResult> {
    const cmd = Command.create(command, args ?? []);

    if (options?.cwd) {
      cmd.currentDirectory(options.cwd);
    }
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        cmd.env(key, value);
      });
    }

    const output = await cmd.execute();

    return {
      code: output.code,
      stdout: output.stdout,
      stderr: output.stderr,
    };
  }

  /**
   * Open URL in default browser
   */
  static async open(url: string): Promise<void> {
    return TauriShell.open(url);
  }

  /**
   * Execute command and get stdout
   */
  static async exec(command: string, args?: string[]): Promise<string> {
    const result = await this.execute(command, args);
    if (result.code !== 0) {
      throw new Error(`Command failed with code ${result.code}: ${result.stderr}`);
    }
    return result.stdout;
  }
}
