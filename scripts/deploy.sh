#!/bin/bash

DEPLOYMENT_NAME="music-practice-app"
MAX_RETRIES=3
RETRY_DELAY=5

check_health() {
  for i in $(seq 1 $MAX_RETRIES); do
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
      echo "Health check passed"
      return 0
    fi
    echo "Health check attempt $i failed, retrying in $RETRY_DELAY seconds..."
    sleep $RETRY_DELAY
  done
  echo "Health check failed after $MAX_RETRIES attempts"
  return 1
}

rollback() {
  echo "Initiating rollback..."
  
  docker-compose down
  
  docker-compose up -d --build
  
  if check_health; then
    echo "Rollback successful"
    notify_success
  else
    echo "Rollback failed, manual intervention required"
    notify_failure
    exit 1
  fi
}

notify_success() {
  echo "Deployment rollback completed successfully"
}

notify_failure() {
  echo "Deployment rollback failed - requires manual intervention"
}

deploy() {
  echo "Starting deployment..."
  
  docker-compose build
  
  docker-compose up -d
  
  if check_health; then
    echo "Deployment successful"
  else
    echo "Deployment failed, initiating rollback"
    rollback
  fi
}

if [ "$1" == "rollback" ]; then
  rollback
else
  deploy
fi