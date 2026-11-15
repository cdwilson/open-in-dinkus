# Open in Dinkus

Open Markdown files from Visual Studio Code in [Dinkus](https://dinkus.textualize.io/), the markdown studio for macOS.

This is an unofficial, community-made extension. It is not affiliated with or endorsed by Textualize, the makers of Dinkus. The Dinkus name and logo belong to Textualize.

## Features

**Open in Dinkus** is available for Markdown files in five places:

| Where | How |
| --- | --- |
| Explorer | Right-click a Markdown file. Select several files first to open them all at once. |
| Editor | Right-click anywhere in an open Markdown file. |
| Editor title bar | Click the Dinkus button (three asterisks) at the top right of a Markdown editor. |
| Editor tab | Right-click the tab of a Markdown file. |
| Command Palette | Press `Cmd+Shift+P` and run **Open in Dinkus**. |

If the file has unsaved changes, they are saved first so that Dinkus shows the same text as VS Code.

## Requirements

- macOS on an Apple Silicon Mac. Dinkus is a Mac-only app.
- [Dinkus](https://dinkus.textualize.io/) installed from the Mac App Store.
- VS Code 1.90 or later.

No other setup is needed. You do not have to add anything to your `PATH` or create a shell alias.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `openInDinkus.showEditorTitleButton` | `true` | Shows the button in the editor title bar. Turn it off to hide the button and keep the menu entries. |
| `openInDinkus.saveBeforeOpening` | `true` | Saves unsaved changes before opening a file. With this off, Dinkus shows the last saved version. |

## Keyboard shortcut

The extension does not claim a shortcut by default. To add one, run **Preferences: Open Keyboard Shortcuts (JSON)** from the Command Palette and add an entry such as:

```json
{
  "key": "cmd+alt+d",
  "command": "openInDinkus.open",
  "when": "editorLangId == markdown"
}
```

## Pictures in your documents

The extension hands Dinkus the file itself, so Dinkus opens it on its own rather than as part of a folder. That affects pictures the document links to:

- **Relative paths** such as `images/chart.png` or `../images/chart.png`: the first time, Dinkus asks for permission to read the folder the pictures are in. Choose **Allow…** to let Dinkus show them.
- **Paths that start with a slash** such as `/images/chart.png`: these are not shown. Dinkus resolves them from the root of a folder opened with **File > Open Folder…**, and a file opened from another app has no such folder. To see these pictures, open the folder in Dinkus and choose the document from its folder pane.

## Limitations

- Only files stored on your Mac can be opened. Files in a remote workspace (SSH, a dev container, WSL, Codespaces) or a virtual workspace live somewhere Dinkus cannot reach, so the menu entries are hidden for them.
- A new file must be saved to disk before it can be opened in Dinkus.
- The menu entries appear only for files VS Code recognises as Markdown.

## Privacy and security

- The extension collects no data and makes no network requests.
- It has no runtime dependencies.
- It runs only when you use the command. It does nothing at startup or in the background.
- Files are handed to Dinkus through the macOS `open` tool, addressed by Dinkus's app identifier. File names are passed as data and never through a shell, so unusual characters in a file name cannot run commands.

To report a security problem, see [SECURITY.md](SECURITY.md).

## Troubleshooting

- **"Dinkus does not appear to be installed on this Mac."** Install Dinkus from the Mac App Store, then try again.
- **Nothing happens, or you see another error.** Run **Output: Show Output Channels…** from the Command Palette and choose **Open in Dinkus** to see the log, then [open an issue](https://github.com/cdwilson/open-in-dinkus/issues) with what it shows.

## License

[MIT](LICENSE)
