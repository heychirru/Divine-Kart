#!/bin/bash

# Docker Hub Push Script for DivineKart
# Usage: ./push-docker.sh [dockerhub-username] [tag]

DOCKERHUB_USERNAME=${1:-"chirru"}
TAG=${2:-"latest"}
IMAGE_NAME="divinekart"

echo "🚀 Pushing DivineKart to Docker Hub..."
echo "📦 Image: $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG"

# Tag the image
echo "🏷️  Tagging image..."
docker tag $IMAGE_NAME:latest $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG

# Push the image
echo "⬆️  Pushing image to Docker Hub..."
docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG

echo "✅ Done! Your image is available at:"
echo "   docker pull $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG"

