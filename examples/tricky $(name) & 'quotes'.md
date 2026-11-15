# A file with an awkward name

This file's name contains spaces, quotes, an ampersand and `$( )`.

A launcher that builds a shell command from the file name would break on it,
or worse, run part of the name as a command. Open in Dinkus passes file names
to macOS as plain data, so this file should open in Dinkus like any other.
