#!/usr/bin/bash

rm -r build
nwbuild -p osx64,win64 .
mv build/WGo\ Editor/osx64 build/WGoEditor
zip -r build/WGoEditor.osx64.zip build/WGoEditor
mv build/WGoEditor build/WGo\ Editor/osx64
mv build/WGo\ Editor/win64 build/WGoEditor
zip -r build/WGoEditor.win64.zip build/WGoEditor
mv build/WGoEditor build/WGo\ Editor/win64
