/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Content } from '@google/genai';
import { HistoryItemWithoutId } from '../types.js';
import { Config, GitService, Logger } from '@google/gemini-cli-core';
import { LoadedSettings } from '../../config/settings.js';
import { UseHistoryManagerReturn } from '../hooks/useHistoryManager.js';
import type { HistoryItem } from '../types.js';
import { SessionStatsState } from '../contexts/SessionContext.js';

// Grouped dependencies for clarity and easier mocking
export interface CommandContext {
  // Core services and configuration
  services: {
    // TODO(abhipatel12): Ensure that config is never null.
    config: Config | null;
    settings: LoadedSettings;
    git: GitService | undefined;
    logger: Logger;
  };
  // UI state and history management
  ui: {
    /** Adds a new item to the history display. */
    addItem: UseHistoryManagerReturn['addItem'];
    /** Clears all history items and the console screen. */
    clear: () => void;
    /**
     * Sets the transient debug message displayed in the application footer in debug mode.
     */
    setDebugMessage: (message: string) => void;
    /** The currently pending history item, if any. */
    pendingItem: HistoryItemWithoutId | null;
    /**
     * Sets a pending item in the history, which is useful for indicating
     * that a long-running operation is in progress.
     *
     * @param item The history item to display as pending, or `null` to clear.
     */
    setPendingItem: (item: HistoryItemWithoutId | null) => void;
    /**
     * Loads a new set of history items, replacing the current history.
     *
     * @param history The array of history items to load.
     */
    loadHistory: UseHistoryManagerReturn['loadHistory'];
    /** Toggles a special display mode. */
    toggleCorgiMode: () => void;
  };
  // Session-specific data
  session: {
    stats: SessionStatsState;
  };
}

/**
 * The return type for a command action that results in scheduling a tool call.
 */
export interface ToolActionReturn {
  type: 'tool';
  toolName: string;
  toolArgs: Record<string, unknown>;
}

/** The return type for a command action that results in the app quitting. */
export interface QuitActionReturn {
  type: 'quit';
  messages: HistoryItem[];
}

/**
 * The return type for a command action that results in a simple message
 * being displayed to the user.
 */
export interface MessageActionReturn {
  type: 'message';
  messageType: 'info' | 'error';
  content: string;
}

/**
 * The return type for a command action that needs to open a dialog.
 */
export interface OpenDialogActionReturn {
  type: 'dialog';
  dialog: 'help' | 'auth' | 'theme' | 'editor' | 'privacy';
}

/**
 * The return type for a command action that results in replacing
 * the entire conversation history.
 */
export interface LoadHistoryActionReturn {
  type: 'load_history';
  history: HistoryItemWithoutId[];
  clientHistory: Content[]; // The history for the generative client
}

/**
 * The return type for a command action that should immediately submit
 * content as a prompt to the Gemini model.
 */
export interface SubmitPromptActionReturn {
  type: 'submit_prompt';
  content: string;
}

export type SlashCommandActionReturn =
  | ToolActionReturn
  | MessageActionReturn
  | QuitActionReturn
  | OpenDialogActionReturn
  | LoadHistoryActionReturn
  | SubmitPromptActionReturn;

export enum CommandKind {
  BUILT_IN = 'built-in',
  FILE = 'file',
}

// The standardized contract for any command in the system.
export interface SlashCommand {
  name: string;
  altNames?: string[];
  description: string;

  kind: CommandKind;

  // The action to run. Optional for parent commands that only group sub-commands.
  action?: (
    context: CommandContext,
    args: string,
  ) =>
    | void
    | SlashCommandActionReturn
    | Promise<void | SlashCommandActionReturn>;

  // Provides argument completion (e.g., completing a tag for `/chat resume <tag>`).
  completion?: (
    context: CommandContext,
    partialArg: string,
  ) => Promise<string[]>;

  subCommands?: SlashCommand[];
}
