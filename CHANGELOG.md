# Changelog

All notable changes to the Open in Dinkus extension are listed here.

## 0.2.0

- **Open in Dinkus** now appears for folders in the Explorer context menu and
  opens the folder in Dinkus as a root folder.
- A selection that mixes folders and files opens its folders and its Markdown
  files.
- The Explorer entry for Markdown files has moved from the top of the first
  section of the context menu to the end of it, below **Open in Integrated
  Terminal**, so it is in the same place for files and folders.

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
