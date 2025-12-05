#!/bin/bash
cd /home/kavia/workspace/code-generation/grocery-hub-220328-220338/grocery_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

