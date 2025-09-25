# CLI Commands

Nebius CLI supports several built-in commands to help you manage your session, customize the interface, and control its behavior. These commands are prefixed with a forward slash (`/`), an at symbol (`@`), or an exclamation mark (`!`).

## Slash commands (`/`)

Slash commands provide meta-level control over the CLI itself.

### Built-in Commands

- **`/bug`**
  - **Description:** File an issue about Nebius CLI. By default, the issue is filed within the GitHub repository for Nebius CLI. The string you enter after `/bug` will become the headline for the bug being filed. The default `/bug` behavior can be modified using the `bugCommand` setting in your `.nebius/settings.json` files.

- **`/chat`**
  - **Description:** Save and resume conversation history for branching conversation state interactively, or resuming a previous state from a later session.
  - **Sub-commands:**
    - **`save`**
      - **Description:** Saves the current conversation history. You must add a `<tag>` for identifying the conversation state.
      - **Usage:** `/chat save <tag>`
      - **Details on Checkpoint Location:** The default locations for saved 
    - **`resume`**
      - **Description:** Resumes a conversation from a previous save.
      - **Usage:** `/chat resume <tag>`
    - **`list`**
      - **Description:** Lists available tags for chat state resumption.
    - **`delete`**
      - **Description:** Deletes a saved conversation checkpoint.
      - **Usage:** `/chat delete <tag>`

- **`/clear`**
  - **Description:** Clear the terminal screen, including the visible session history and scrollback within the CLI. The underlying session data (for history recall) might be preserved depending on the exact implementation, but the visual display is cleared.
  - **Keyboard shortcut:** Press **Ctrl+L** at any time to perform a clear action.

- **`/compress`**
  - **Description:** Replace the entire chat context with a summary. This saves on tokens used for future tasks while retaining a high level summary of what has happened.

- **`/copy`**
  - **Description:** Copies the last output produced by Nebius CLI to your clipboard, for easy sharing or reuse.

- **`/directory`** (or **`/dir`**)
  - **Description:** Manage workspace directories for multi-directory support.
  - **Sub-commands:**
    - **`add`**:
      - **Description:** Add a directory to the workspace. The path can be absolute or relative to the current working directory. Moreover, the reference from home directory is supported as well.
      - **Usage:** `/directory add <path1>,<path2>`
      - **Note:** Disabled in restrictive sandbox profiles. If you're using that, use `--include-directories` when starting the session instead.
    - **`show`**:
      - **Description:** Display all directories added by `/directory add` and `--include-directories`.
      - **Usage:** `/directory show`

- **`/directory`** (or **`/dir`**)
  - **Description:** Manage workspace directories for multi-directory support.
  - **Sub-commands:**
    - **`add`**:
      - **Description:** Add a directory to the workspace. The path can be absolute or relative to the current working directory. Moreover, the reference from home directory is supported as well.
      - **Usage:** `/directory add <path1>,<path2>`
      - **Note:** Disabled in restrictive sandbox profiles. If you're using that, use `--include-directories` when starting the session instead.
    - **`show`**:
      - **Description:** Display all directories added by `/directory add` and `--include-directories`.
      - **Usage:** `/directory show`

- **`/editor`**
  - **Description:** Open a dialog for selecting supported editors.

- **`/extensions`**
  - **Description:** Lists all active extensions in the current Nebius CLI session. See [Nebius CLI Extensions](../extension.md).

- **`/help`** (or **`/?`**)
  - **Description:** Display help information about the Nebius CLI, including available commands and their usage.

- **`/mcp`**
  - **Description:** List configured Model Context Protocol (MCP) servers, their connection status, server details, and available tools.
  - **Sub-commands:**
    - **`desc`** or **`descriptions`**:
      - **Description:** Show detailed descriptions for MCP servers and tools.
    - **`nodesc`** or **`nodescriptions`**:
      - **Description:** Hide tool descriptions, showing only the tool names.
    - **`schema`**:
      - **Description:** Show the full JSON schema for the tool's configured parameters.
  - **Keyboard Shortcut:** Press **Ctrl+T** at any time to toggle between showing and hiding tool descriptions.

- **`/memory`**
  - **Description:** Manage the AI's instructional context (hierarchical memory loaded from `NEBIUS.md` files by default; configurable via `contextFileName`).
  - **Sub-commands:**
    - **`add`**:
      - **Description:** Adds the following text to the AI's memory. Usage: `/memory add <text to remember>`
    - **`show`**:
      - **Description:** Display the full, concatenated content of the current hierarchical memory that has been loaded from all context files (e.g., `NEBIUS.md`). This lets you inspect the instructional context being provided to the model.
    - **`refresh`**:
      - **Description:** Reload the hierarchical instructional memory from all context files (default: `NEBIUS.md`) found in the configured locations (global, project/ancestors, and sub-directories). This updates the model with the latest context content.
    - **Note:** For more details on how context files contribute to hierarchical memory, see the [CLI Configuration documentation](./configuration.md#context-files-hierarchical-instructional-context).

- **`/restore`**
  - **Description:** Restores the project files to the state they were in just before a tool was executed. This is particularly useful for undoing file edits made by a tool. If run without a tool call ID, it will list available checkpoints to restore from.
  - **Usage:** `/restore [tool_call_id]`
  - **Note:** Only available if the CLI is invoked with the `--checkpointing` option or configured via [settings](./configuration.md). See [Checkpointing documentation](../checkpointing.md) for more details.

- **`/stats`**
  - **Description:** Display detailed statistics for the current Nebius CLI session, including token usage, cached token savings (when available), and session duration. Note: Cached token information is only displayed when cached tokens are being used, which occurs with API key authentication but not with OAuth authentication at this time.

- [**`/theme`**](./themes.md)
  - **Description:** Open a dialog that lets you change the visual theme of Nebius CLI.

- **`/auth`**
  - **Description:** Open a dialog that lets you change the authentication method.

- **`/about`**
  - **Description:** Show version info. Please share this information when filing issues.

- [**`/tools`**](../tools/index.md)
  - **Description:** Display a list of tools that are currently available within Nebius CLI.
  - **Sub-commands:**
    - **`desc`** or **`descriptions`**:
      - **Description:** Show detailed descriptions of each tool, including each tool's name with its full description as provided to the model.
    - **`nodesc`** or **`nodescriptions`**:
      - **Description:** Hide tool descriptions, showing only the tool names.

- **`/privacy`**
  - **Description:** Display the Privacy Notice and allow users to select whether they consent to the collection of their data for service improvement purposes.

- **`/quit`** (or **`/exit`**)
  - **Description:** Exit Nebius CLI.

- **`/vim`**
  - **Description:** Toggle vim mode on or off. When vim mode is enabled, the input area supports vim-style navigation and editing commands in both NORMAL and INSERT modes.
  - **Features:**
    - **NORMAL mode:** Navigate with `h`, `j`, `k`, `l`; jump by words with `w`, `b`, `e`; go to line start/end with `0`, `$`, `^`; go to specific lines with `G` (or `gg` for first line)
    - **INSERT mode:** Standard text input with escape to return to NORMAL mode
    - **Editing commands:** Delete with `x`, change with `c`, insert with `i`, `a`, `o`, `O`; complex operations like `dd`, `cc`, `dw`, `cw`
    - **Count support:** Prefix commands with numbers (e.g., `3h`, `5w`, `10G`)
    - **Repeat last command:** Use `.` to repeat the last editing operation
    - **Persistent setting:** Vim mode preference is saved to `~/.nebius/settings.json` and restored between sessions
  - **Status indicator:** When enabled, shows `[NORMAL]` or `[INSERT]` in the footer

- **`/init`**
  - **Description:** Analyzes the current directory and creates a `NEBIUS.md` context file by default (or the filename specified by `contextFileName`). If a non-empty file already exists, no changes are made. The command seeds an empty file and prompts the model to populate it with project-specific instructions.

### Custom Commands

For a quick start, see the [example](#example-a-pure-function-refactoring-command) below.

Custom commands allow you to save and reuse your favorite or most frequently used prompts as personal shortcuts within Nebius CLI. You can create commands that are specific to a single project or commands that are available globally across all your projects, streamlining your workflow and ensuring consistency.

#### TOML File Format (v1)

Your command definition files must be written in the TOML format and use the `.toml` file extension.

##### Required Fields

- `prompt` (String): The prompt that will be sent to the Nebius model when the command is executed. This can be a single-line or multi-line string.

##### Optional Fields

- `description` (String): A brief, one-line description of what the command does. This text will be displayed next to your command in the `/help` menu. **If you omit this field, a generic description will be generated from the filename.**

#### Handling Arguments

Custom commands support two powerful, low-friction methods for handling arguments. The CLI automatically chooses the correct method based on the content of your command's `prompt`.

##### 1. Shorthand Injection with `{{args}}`

If your `prompt` contains the special placeholder `{{args}}`, the CLI will replace that exact placeholder with all the text the user typed after the command name. This is perfect for simple, deterministic commands where you need to inject user input into a specific place in a larger prompt template.

##### 2. Default Argument Handling

If your `prompt` does **not** contain the special placeholder `{{args}}`, the CLI uses a default behavior for handling arguments.

If you provide arguments to the command (e.g., `/mycommand arg1`), the CLI will append the full command you typed to the end of the prompt, separated by two newlines. This allows the model to see both the original instructions and the specific arguments you just provided.

If you do **not** provide any arguments (e.g., `/mycommand`), the prompt is sent to the model exactly as it is, with nothing appended.

##### 3. Executing Shell Commands with `!{...}`

You can make your commands dynamic by executing shell commands directly within your `prompt` and injecting their output. This is ideal for gathering context from your local environment, like reading file content or checking the status of Git.

When a custom command attempts to execute a shell command, Nebius CLI will now prompt you for confirmation before proceeding. This is a security measure to ensure that only intended commands can be run.

**How It Works:**

1.  **Inject Commands:** Use the `!{...}` syntax in your `prompt` to specify where the command should be run and its output injected.
2.  **Confirm Execution:** When you run the command, a dialog will appear listing the shell commands the prompt wants to execute.
3.  **Grant Permission:** You can choose to:
    - **Allow once:** The command(s) will run this one time.
    - **Allow always for this session:** The command(s) will be added to a temporary allowlist for the current CLI session and will not require confirmation again.
    - **No:** Cancel the execution of the shell command(s).

The CLI still respects the global `excludeTools` and `coreTools` settings. A command will be blocked without a confirmation prompt if it is explicitly disallowed in your configuration.
