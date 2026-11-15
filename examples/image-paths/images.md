# Image paths

This page links to three pictures in three different ways. Use it to check
which ones Dinkus can show.

## A: from the folder root

`![A](/assets/a.png)` starts with a slash, so it is resolved from the root of
the folder that is open, not from this file's location. In VS Code's preview
the root is the workspace folder (`examples`). Dinkus resolves it from the
folder opened with File > Open Folder.

![A](/assets/a.png)

## B: from the parent folder

`![B](../assets/b.png)` is relative to this file and climbs out of its folder.

![B](../assets/b.png)

## C: from the same folder

`![C](c.png)` sits next to this file.

![C](c.png)
