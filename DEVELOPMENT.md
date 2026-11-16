# Developing, testing and publishing

This guide assumes no prior experience with VS Code extensions. Run every command from the root of this repository.

- [How the extension works](#how-the-extension-works)
  - [Pictures and the root folder](#pictures-and-the-root-folder)
- [One-time setup](#one-time-setup)
- [Testing](#testing)
- [Publishing](#publishing)
- [Maintenance](#maintenance)

## How the extension works

A VS Code extension is a folder with a `package.json` (the *manifest*) and some JavaScript. The manifest tells VS Code what the extension adds; the JavaScript runs when one of those additions is used.

| File | Purpose |
| --- | --- |
| `package.json` | The manifest. Declares the **Open in Dinkus** command, the menus it appears in (`contributes.menus`), the two settings, and the Marketplace listing details. |
| `src/extension.ts` | Entry point. Registers the command and handles the user-facing flow: messages, saving, error reporting. |
| `src/targets.ts` | Works out which files and folders a command invocation refers to and which of them Dinkus can open. |
| `src/dinkus.ts` | Starts Dinkus by running `/usr/bin/open -b io.textualize.dinkus <files or folders>`. |
| `src/test/` | Automated tests. |
| `esbuild.js` | Build script. Bundles `src/` into one file, `dist/extension.js`, which is what VS Code loads and what gets published. |
| `examples/` | Markdown files for trying the extension. Not published. |
| `.vscode/` | Makes F5 work in this repository. Not published. |
| `.github/` | Automated checks, the release workflow, and dependency update settings. |

The `when` conditions in `contributes.menus` control where the command is visible: only on macOS (`isMac`), only for Markdown (`resourceLangId == markdown`), and only for files on the local disk (`resourceScheme == file`). The Explorer entry also accepts folders (`explorerResourceIsFolder`). It is one entry with one position for both, which is what keeps the menu the same whether a file or a folder is right-clicked.

### Pictures and the root folder

Dinkus opens things in one of two ways: a *folder* (File > Open Folder…), or a document *on its own*. Only a folder gives Dinkus a root, which it needs to resolve picture paths that start with a slash, such as `/assets/a.png`.

Everything the extension can send goes through macOS, which delivers it the same way as a double-click in the Finder. Tested against Dinkus 1.11.0:

| What is sent | What Dinkus does |
| --- | --- |
| The file (what the extension does) | Opens the document on its own and asks for access to the folder that holds its relative pictures. Slash-rooted pictures are not shown, and Dinkus does not ask about them. |
| The folder and the file together | Opens a folder window *and* a separate window with the document on its own. Relative pictures show without a prompt, slash-rooted ones still do not. |
| The folder, then the file | The same. A file inside an already-open folder still opens on its own. |
| The same folder twice | Two folder windows. |

So sending the workspace folder as well does not give the document a root, and it leaves an extra window behind each time. That is why the extension sends only the file.

A folder is sent only when the user asks for one, by right-clicking it in the Explorer. Dinkus then opens a folder window with that folder as its root. Dinkus has no command-line option or URL scheme that could carry a root.

Supporting slash-rooted pictures needs a change in Dinkus, for example opening a file from another app as a tab in the window of an already-open folder that contains it. If that arrives, the place to use it is `buildOpenArgs` in `src/dinkus.ts`, with `vscode.workspace.getWorkspaceFolder(uri)` supplying the root. `examples/image-paths/images.md` is the test case.

## One-time setup

1. Install [Node.js](https://nodejs.org/) 22 or later.
2. Install the build tools:

   ```sh
   npm install
   ```

3. Open this folder in VS Code. It may offer to install two recommended extensions, *ESLint* and *Extension Test Runner*. Both are optional conveniences; nothing below depends on them.

## Testing

There are three levels. Do the first while developing, and all three before a release.

### 1. Try it live with F5

1. Open this folder in VS Code and press **F5** (or choose **Run > Start Debugging**).
2. A second VS Code window opens, titled **[Extension Development Host]**, with the `examples` folder open. This window has your working copy of the extension loaded. Your normal VS Code setup is not affected.

   Your other installed extensions run in that window too, and their warnings appear in the **Debug Console** alongside anything from this extension. To leave them out, pick **Run Extension (other extensions off)** from the dropdown at the top of the **Run and Debug** view before pressing F5.
3. In that window, check each of these opens the file in Dinkus:

   - [ ] Explorer: right-click `sample.md` > **Open in Dinkus**.
   - [ ] Explorer: right-click the file named `tricky $(name) & 'quotes'.md` > **Open in Dinkus**. It should open normally despite its name.
   - [ ] Explorer: select both files (Cmd-click), right-click one > **Open in Dinkus**. Both should open.
   - [ ] Explorer: right-click the `image-paths` folder > **Open in Dinkus**. Dinkus should open a folder window with `image-paths` as its root.
   - [ ] Explorer: select `sample.md`, the `assets` folder and `assets/a.png` (Cmd-click), right-click `sample.md` > **Open in Dinkus**. The file and the folder should open, and the picture should not.
   - [ ] Explorer: in the menus for `sample.md` and for the `assets` folder, **Open in Dinkus** should be the last entry of the first section, directly below **Open in Integrated Terminal**.
   - [ ] Open `sample.md`, right-click inside the editor > **Open in Dinkus**.
   - [ ] Click the Dinkus button (three asterisks) at the top right of the editor. Check it is visible in both a light and a dark theme.
   - [ ] Right-click the editor's tab > **Open in Dinkus**.
   - [ ] Press Cmd+Shift+P and run **Open in Dinkus**.
   - [ ] Type something in `sample.md` without saving, then open it in Dinkus. The file should be saved and Dinkus should show the new text.
   - [ ] Open `image-paths/images.md` in Dinkus. Dinkus should ask for access to the `examples` folder; after **Allow…**, pictures B and C should appear. Picture A, whose path starts with a slash, is expected to stay missing: see [Pictures and the root folder](#pictures-and-the-root-folder).

4. Check the things that should *not* happen:

   - [ ] Create a non-Markdown file (for example `notes.txt`). It should have no **Open in Dinkus** entry and no title bar button.
   - [ ] Press Cmd+N for a new untitled file and set its language to Markdown. The menu entries should not appear, because the file is not on disk yet.
   - [ ] In Settings, turn off **Open in Dinkus: Show Editor Title Button**. The button should disappear and the menu entries remain.

5. After changing code, press Cmd+R in the Extension Development Host window to reload it with the new build. Breakpoints set in `src/` in the first window work. To see the extension's log, run **Output: Show Output Channels…** in the development host and pick **Open in Dinkus**.

### 2. Run the automated tests

```sh
npm test
```

This type-checks and lints the code, builds it, downloads a private copy of VS Code into `.vscode-test/` (first run only, about 370 MB), and runs the tests inside it. A VS Code window flashes open and closes. Dinkus is not started.

To also run the two tests that really start Dinkus, one opening three example files (`sample.md`, the file with the tricky name, and `image-paths/images.md`) and one opening the `examples` folder:

```sh
npm run test:dinkus
```

Each test passes when macOS has handed its files or folder to Dinkus. It cannot see inside Dinkus, so look at the `images.md` window yourself to check the pictures: expect the result described in the F5 checklist above.

### 3. Install the packaged extension

This tests the exact file you would publish.

```sh
npm run vsix
code --install-extension open-in-dinkus-0.1.0.vsix
```

`npm run vsix` creates `open-in-dinkus-<version>.vsix` and lists the files inside it. Check that list: it should contain only `package.json`, `readme.md`, `changelog.md`, `LICENSE.txt`, `dist/extension.js`, and three files in `images/`: `icon.png`, `dinkus-light.svg` and `dinkus-dark.svg`.

Then reload VS Code (**Developer: Reload Window**) and use the extension for real work for a while. If you still have the Typora Open extension installed, both will show their own menu entries; disable it if you want to compare cleanly.

To remove the test install:

```sh
code --uninstall-extension cdwilson.open-in-dinkus
```

If the `code` command is not found, run **Shell Command: Install 'code' command in PATH** from the Command Palette, or install the file from the Extensions view: **…** menu > **Install from VSIX…**.

## Publishing

Extensions are published to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode) under a *publisher*. This extension's publisher ID is `cdwilson` (the `publisher` field in `package.json`), so its full ID is `cdwilson.open-in-dinkus`.

A publisher also has a display name, which is what the Marketplace and the Extensions view of VS Code show next to the extension. For this extension it is **Chris Wilson**. The display name is set on the publisher's Marketplace profile, not in `package.json`, so an extension installed from a local `.vsix` shows `cdwilson` instead.

> **About older tutorials.** Many guides tell you to create an Azure DevOps Personal Access Token and run `vsce login` and `vsce publish`. Microsoft retires those tokens on **December 1, 2026**, so this guide does not use them. The two methods below need no token: uploading through the website, and publishing from GitHub Actions with Trusted Publishing.

### Before the first release

1. **Commit and push the code** so the repository matches what you are about to publish. The Marketplace page links to it, and images and links in the README resolve against it.

2. **Create the publisher.**
   1. Go to <https://marketplace.visualstudio.com/manage> and sign in with a Microsoft account. A personal account works; create one if needed.
   2. Select **Create publisher**.
   3. Set **ID** to `cdwilson`. It must match `package.json` exactly and can never be changed. If the ID is taken, choose another and change `publisher` in `package.json` and `EXTENSION_ID` in `src/test/extension.test.ts` to match.
   4. Set **Name** to `Chris Wilson`, then select **Create**. This is the display name shown to users. Unlike the ID, it can be changed later from the publisher's details page.

3. **Turn on two GitHub security settings** for the repository, under **Settings > Advanced Security** (named *Code security* on some accounts):
   - **Private vulnerability reporting**, which `SECURITY.md` tells reporters to use.
   - **Dependabot alerts**, which notify you about vulnerable build tools.

### First release: upload through the website

Publishing the first version by hand is the simplest way to confirm that the publisher and listing are right.

1. Run all three levels of [testing](#testing).
2. Build the package:

   ```sh
   npm run vsix
   ```

3. Go to <https://marketplace.visualstudio.com/manage>, choose the `cdwilson` publisher, and select **New extension > Visual Studio Code**.
4. Drag in `open-in-dinkus-0.1.0.vsix` and select **Upload**.
5. The Marketplace verifies the upload, which usually takes a few minutes. When the status shows as verified, the extension is live at <https://marketplace.visualstudio.com/items?itemName=cdwilson.open-in-dinkus> and can be found in the Extensions view of VS Code.
6. Tag the release so the repository records what was published:

   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```

### Set up automated releases (one time)

`.github/workflows/publish.yml` publishes to the Marketplace whenever you publish a GitHub release. It signs in with *Trusted Publishing*: GitHub proves to the Marketplace which repository and workflow is running, so no secret is stored anywhere. You tell the Marketplace once which workflow to trust:

1. Go to <https://marketplace.visualstudio.com/manage> and open the `cdwilson` publisher.
2. Select **Trusted Publishing**, then expand **Create**.
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Policy name | `Release workflow` |
   | Repository owner | `cdwilson` |
   | Repository | `open-in-dinkus` |
   | Workflow | `publish.yml` |
   | Environment | leave empty |

4. Select **Create**.

Do not rename `publish.yml` afterwards; the policy identifies the workflow by that file name.

This workflow has not been run yet, because it needs the publisher and policy above. Treat the first automated release as a test: watch the run, and if it fails, the manual upload below still works. Microsoft's documentation does not say whether a brand-new extension can be created through Trusted Publishing, which is another reason to do the first release by hand.

### Every later release

1. Describe the changes in `CHANGELOG.md` under a new version heading and commit.
2. Bump the version. This updates `package.json`, commits, and creates a matching `v…` tag:

   ```sh
   npm version patch   # 0.1.0 -> 0.1.1, for fixes
   npm version minor   # 0.1.0 -> 0.2.0, for new features
   ```

3. Push the commit and the tag, and wait for the CI check on GitHub to pass:

   ```sh
   git push --follow-tags
   ```

4. Publish a GitHub release for that tag. This starts the publish workflow:

   ```sh
   gh release create v0.1.1 --generate-notes
   ```

   You can also do this on GitHub: **Releases > Draft a new release**, choose the tag, **Publish release**.

5. Watch the run under the repository's **Actions** tab, or with `gh run watch`. The workflow refuses to publish if the release tag and the `package.json` version differ, and it runs the tests first.

A version number can be published only once. If a release goes wrong, fix the problem and release the next patch version.

**Manual fallback.** Run `npm run vsix`, go to the publisher page, open the **…** menu next to the extension, choose **Update**, and upload the new `.vsix`.

### Optional: publish to Open VSX

VS Code forks such as Cursor, Windsurf and VSCodium cannot use Microsoft's Marketplace; they install from [Open VSX](https://open-vsx.org/). To list the extension there as well:

1. Create an [Eclipse account](https://accounts.eclipse.org/user/register), entering your GitHub username in the form.
2. Sign in at <https://open-vsx.org> with GitHub. Under **Settings > Profile**, select **Log in with Eclipse**, then read and accept the Publisher Agreement.
3. Under **Settings > Access Tokens**, generate a token and copy it. It is shown only once. Treat it like a password and do not commit it.
4. Create the namespace once, then publish the same `.vsix` you uploaded to the Marketplace:

   ```sh
   npx ovsx create-namespace cdwilson -p <token>
   npx ovsx publish open-in-dinkus-0.1.0.vsix -p <token>
   ```

## Maintenance

- **Dependency updates.** Dependabot opens a weekly pull request for the build tools and GitHub Actions. If CI passes, merge it. None of these tools ship inside the extension; it has no runtime dependencies, and a test fails if one is added.
- **Minimum VS Code version.** `engines.vscode` in `package.json` is the oldest VS Code the extension supports. The `@types/vscode` version must be the same and never higher, so that code cannot use features missing from that version. Raise both together.
- **Install scripts.** `allowScripts` in `package.json` stops two build tools from running scripts during `npm install`. Both work without them. If a future tool needs its install script, npm prints a notice; review it with `npm install-scripts ls` before approving.
- **`overrides` in `package.json`.** These force patched versions of four packages used internally by the test and lint tools. When `npm audit` reports nothing without an entry, the entry can be removed.
- **The icons.** Both come from the Dinkus logo at <https://dinkus.textualize.io/assets/img/dinkus.webp>, which belongs to Textualize.
  - `images/icon.png` is the Marketplace icon: the logo scaled to 256 pixels. The Marketplace does not accept SVG icons.
  - `images/dinkus-light.svg` and `images/dinkus-dark.svg` are the title bar button: the logo's outline in one colour, the same silhouette the Dinkus website uses as a section separator. VS Code picks the file that matches the colour theme. The two files differ only in fill colour (`#424242` for light themes, `#C5C5C5` for dark), which are the greys VS Code uses for its own toolbar icons.
- **Where the menu entries appear.** Each entry under `menus` in `package.json` has a `group`, which names the section of the menu it sits in. VS Code shows the `navigation` section first and sorts the rest by name.
  - `navigation@100` (Explorer) puts the entry in VS Code's built-in first section. The number after `@` is its position within the section. VS Code's own entries there end with **Open in Integrated Terminal** at 30 and **Open in External Terminal** at 31, so 100 comes last. Another extension that uses a higher number will sit below it.
  - `Dinkus` (editor and editor tab) is a section of its own. It lands wherever that name sorts among the other sections, which is after VS Code's numbered sections such as `1_modification` and `9_cutcopypaste`.
- **If Dinkus changes its app identifier.** Update `DINKUS_BUNDLE_ID` in `src/dinkus.ts`. Find the current value with `mdls -name kMDItemCFBundleIdentifier /Applications/Dinkus.app`.
