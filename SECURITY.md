# Security policy

## Reporting a vulnerability

Please report security problems privately rather than in a public issue.

Go to the repository's [Security tab](https://github.com/cdwilson/open-in-dinkus/security) and choose **Report a vulnerability**. This opens a private report that only the maintainer can see.

Include what you found, the steps to reproduce it, and the versions of the extension, VS Code and macOS you used.

## Supported versions

Only the latest published version receives security fixes.

## How the extension limits risk

- It starts exactly one program, `/usr/bin/open`, by absolute path and without a shell. File names are passed as separate arguments, so they are never interpreted as commands.
- The app it opens is fixed in the code by its macOS bundle identifier. No setting can redirect it to a different program.
- It only accepts absolute paths of files on the local disk.
- It passes a minimal set of environment variables to `open`, so tokens and other values in VS Code's environment do not reach the launched app.
- It has no runtime dependencies, makes no network requests, and collects no data.
