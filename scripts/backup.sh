#!/bin/bash

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_NAME="music-practice-app"

mkdir -p $BACKUP_DIR

echo "Creating backup for $APP_NAME..."

if [ -d "./dist" ]; then
  tar -czf $BACKUP_DIR/dist_$DATE.tar.gz ./dist
  echo "Build artifacts backed up: dist_$DATE.tar.gz"
fi

if [ -f "./package.json" ]; then
  cp ./package.json $BACKUP_DIR/package_$DATE.json
  echo "Package config backed up: package_$DATE.json"
fi

find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.json" -mtime +30 -delete

echo "Backup completed successfully"
echo "Backup location: $BACKUP_DIR"