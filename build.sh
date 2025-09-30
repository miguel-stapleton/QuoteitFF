#!/bin/bash
set -e

echo "Building frontend..."
npm ci
npm run build

echo "Building server..."
cd server
npm ci
npm run build

echo "Build completed successfully!"
