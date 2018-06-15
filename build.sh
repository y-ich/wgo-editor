#!/usr/bin/bash

rm -rf build
nwbuild -p osx64,win64 .
#install_name_tool -change "@executable_path/../../../nwjs Framework.framework/nwjs Framework" "@executable_path/../Versions/54.0.2840.71/nwjs Framework.framework/nwjs Framework" build/WGo\ Editor/osx64/WGo\ Editor.app/Contents/Versions/54.0.2840.71/nwjs\ Framework.framework/libnode.dylib
mv build/wgo-editor/osx64 build/WGoEditor
cd build
zip -r WGoEditor.osx64.zip WGoEditor
cd ..
mv build/WGoEditor build/wgo-editor/osx64
mv build/wgo-editor/win64 build/WGoEditor
cd build
zip -r WGoEditor.win64.zip WGoEditor
cd ..
mv build/WGoEditor build/wgo-editor/win64
