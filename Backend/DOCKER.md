# Docker Setup Guide for DivineKart

This guide will help you set up and run DivineKart using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Docker version 20.10 or higher
- Docker Compose version 2.0 or higher

## Quick Start

### 1. Clone the repository and navigate to the project directory

```bash
git clone <repository-url>
cd Divine-Kart/Backend
```

### 2. Create environment file

Create a `.env` file in the root directory based on the following template:

```env
# Server
NODE_ENV=production
PORT=3000

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DATABASE=divinekart
MONGO_URI=mongodb://admin:your-secure-password@mongodb:27017/divinekart?authSource=admin

# JWT
SECRET_KEY_ACCESS_TOKEN=your-access-token-secret
SECRET_KEY_REFRESH_TOKEN=your-refresh-token-secret

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
FRONTEND_URL=http://localhost:5173

# ImageKit (file uploads)
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Email (Resend)
RESEND_API=re_your_resend_api_key

# AI (Gemini)
GEMINI_API_KEY=your-gemini-api-key
```

**Important:** Change all default passwords and secrets before deploying to production!

### 3. Build and start all services

```bash
docker-compose up -d
```

This will:
- Build the Node.js application image
- Start MongoDB container
- Start the application container

### 4. View logs

```bash
# View all logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f mongodb
```

### 5. Check service status

```bash
docker-compose ps
```

### 6. Access the application

- **API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Health Check**: http://localhost:3000/healthz
- **Readiness Check**: http://localhost:3000/readyz

## Development Mode

For development with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This will:
- Mount your local code directory
- Use nodemon for automatic restarts
- Include dev dependencies

## Common Commands

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ This will delete all data)
```bash
docker-compose down -v
```

### Rebuild containers after code changes
```bash
docker-compose up -d --build
```

### Execute commands in running container
```bash
# Access app container shell
docker-compose exec app sh

# Run npm commands
docker-compose exec app npm test
docker-compose exec app npm run lint
```

### View MongoDB data
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password

# Or connect from host
mongosh mongodb://admin:password@localhost:27017/divinekart?authSource=admin
```

## Service Details

### MongoDB
- **Port**: 27017
- **Database**: divinekart (configurable via `MONGO_DATABASE`)
- **Username**: admin (configurable via `MONGO_ROOT_USERNAME`)
- **Password**: Set via `MONGO_ROOT_PASSWORD`
- **Data Volume**: `mongodb_data` (persists data between restarts)

### Application
- **Port**: 3000 (configurable via `PORT`)
- **Health Check**: `/healthz` endpoint
- **Readiness Check**: `/readyz` endpoint
- **Uploads**: Mounted from `./uploads` directory

## Troubleshooting

### Port already in use
If port 3000 or 27017 is already in use, either:
1. Stop the conflicting service
2. Change the port mapping in `docker-compose.yml`

### Container won't start
1. Check logs: `docker-compose logs app`
2. Verify environment variables are set correctly
3. Ensure MongoDB and Redis are healthy: `docker-compose ps`

### Database connection errors
1. Verify MongoDB is running: `docker-compose ps mongodb`
2. Check MongoDB logs: `docker-compose logs mongodb`
3. Verify `MONGO_URI` in `.env` matches the MongoDB service configuration

### Permission errors (Linux)
If you encounter permission errors with volumes:
```bash
sudo chown -R $USER:$USER ./uploads
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `ALLOWED_ORIGINS`
- [ ] Use HTTPS (configure reverse proxy)
- [ ] Set up MongoDB authentication
- [ ] Use Redis password authentication
- [ ] Regularly update base images
- [ ] Set up log rotation
- [ ] Configure backup strategy for MongoDB

### Recommended Production Setup

1. **Use Docker Secrets** (Docker Swarm) or **environment files** (Kubernetes) for sensitive data
2. **Use a reverse proxy** (Nginx/Traefik) for HTTPS termination
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure log aggregation** (ELK stack, Loki)
5. **Use managed databases** (MongoDB Atlas, Redis Cloud) for production

## Building Custom Images

### Build production image
```bash
docker build -t divinekart:latest .
```

### Build development image
```bash
docker build -f Dockerfile.dev -t divinekart:dev .
```

### Run custom image
```bash
docker run -p 3000:3000 --env-file .env divinekart:latest
```

## Cleanup

### Remove all containers, networks, and volumes
```bash
docker-compose down -v --remove-orphans
```

### Remove unused images
```bash
docker image prune -a
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

