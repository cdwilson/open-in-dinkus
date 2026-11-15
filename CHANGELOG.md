# Changelog

All notable changes to the Open in Dinkus extension are listed here.

## 0.1.0

Initial release.

- **Open in Dinkus** command for Markdown files, available from the Explorer
  context menu, the editor context menu, the editor tab context menu, a button
  in the editor title bar, and the Command Palette.
- Opens every Markdown file in an Explorer multi-selection.
- Saves unsaved changes before opening, so Dinkus shows the current text
  (`openInDinkus.saveBeforeOpening`).
- The title bar button can be hidden (`openInDinkus.showEditorTitleButton`).

Known limitation: pictures whose path starts with a slash (`/images/chart.png`)
are not shown, because Dinkus only resolves them inside a folder it has opened.
