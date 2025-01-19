#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to clean up Docker containers
cleanup() {
    echo "Stopping Docker containers..."
    docker compose down
}

# Trap SIGINT (Ctrl+C) and call cleanup function
trap cleanup SIGINT

# Build the Docker images
echo "Building Docker images..."
docker compose build

# Start the Docker containers
echo "Starting Docker containers..."
docker compose up -d