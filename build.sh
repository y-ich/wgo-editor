#!/usr/bin/bash
VERSION=0.2.11
npm update
rm -rf dist/*
npm run dist
cd dist
mv wgo-editor-$VERSION-mac-x64 wgo-editor-mac-x64
zip -r wgo-editor.mac-x64.zip wgo-editor-mac-x64
mv wgo-editor-mac-x64 wgo-editor-$VERSION-mac-x64
#zip -r wgo-editor.linux-x64.zip wgo-editor-0.1.1-linux-x64
#zip -r wgo-editor.win-x64.zip wgo-editor-0.1.1-win-x64
cd ..
