# Docker Hub Push Script for DivineKart (PowerShell)
# Usage: .\push-docker.ps1 [dockerhub-username] [tag]

param(
    [string]$DockerHubUsername = "chirru",
    [string]$Tag = "latest"
)

$ImageName = "divinekart"

Write-Host "🚀 Pushing DivineKart to Docker Hub..." -ForegroundColor Cyan
Write-Host "📦 Image: $DockerHubUsername/$ImageName`:$Tag" -ForegroundColor Yellow

# Tag the image
Write-Host "🏷️  Tagging image..." -ForegroundColor Green
docker tag "${ImageName}:latest" "${DockerHubUsername}/${ImageName}:${Tag}"

# Push the image
Write-Host "⬆️  Pushing image to Docker Hub..." -ForegroundColor Green
docker push "${DockerHubUsername}/${ImageName}:${Tag}"

Write-Host "✅ Done! Your image is available at:" -ForegroundColor Green
Write-Host "   docker pull ${DockerHubUsername}/${ImageName}:${Tag}" -ForegroundColor Cyan

