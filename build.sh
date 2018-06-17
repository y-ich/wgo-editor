#!/usr/bin/bash

npm run dist
cd dist
zip -r wgo-editor.mac-x64.zip wgo-editor-0.0.2-mac-x64
zip -r wgo-editor.linux-x64.zip wgo-editor-0.0.2-linux-x64
cd ..
