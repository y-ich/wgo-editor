#!/usr/bin/bash
rm -rf dist/*
npm run dist
cd dist
zip -r wgo-editor.mac-x64.zip wgo-editor-0.2.1-mac-x64
#zip -r wgo-editor.linux-x64.zip wgo-editor-0.1.1-linux-x64
#zip -r wgo-editor.win-x64.zip wgo-editor-0.1.1-win-x64
cd ..
