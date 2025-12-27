# Docker Setup Guide for DivineKart

This guide will help you set up and run DivineKart using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Docker version 20.10 or higher
- Docker Compose version 2.0 or higher

## Quick Start

### 1. Clone the repository and navigate to the project directory

```bash
cd DivineKart-
```

### 2. Create environment file

Create a `.env` file in the root directory based on the following template:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DATABASE=divinekart
MONGO_URI=mongodb://admin:your-secure-password@mongodb:27017/divinekart?authSource=admin

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Important:** Change all default passwords and secrets before deploying to production!

### 3. Build and start all services

```bash
docker-compose up -d
```

This will:
- Build the Node.js application image
- Start MongoDB container
- Start Redis container
- Start the application container

### 4. View logs

```bash
# View all logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### 5. Check service status

```bash
docker-compose ps
```

### 6. Access the application

- **API**: http://localhost:3000
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

### View Redis data
```bash
# Access Redis CLI
docker-compose exec redis redis-cli -a redispassword

# Or connect from host
redis-cli -h localhost -p 6379 -a redispassword
```

## Service Details

### MongoDB
- **Port**: 27017
- **Database**: divinekart (configurable via `MONGO_DATABASE`)
- **Username**: admin (configurable via `MONGO_ROOT_USERNAME`)
- **Password**: Set via `MONGO_ROOT_PASSWORD`
- **Data Volume**: `mongodb_data` (persists data between restarts)

### Redis
- **Port**: 6379
- **Password**: Set via `REDIS_PASSWORD`
- **Data Volume**: `redis_data` (persists data between restarts)
- **Persistence**: AOF (Append Only File) enabled

### Application
- **Port**: 3000 (configurable via `PORT`)
- **Health Check**: `/healthz` endpoint
- **Readiness Check**: `/readyz` endpoint
- **Uploads**: Mounted from `./uploads` directory

## Troubleshooting

### Port already in use
If port 3000, 27017, or 6379 is already in use, either:
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

### Redis connection errors
1. Verify Redis is running: `docker-compose ps redis`
2. Check Redis logs: `docker-compose logs redis`
3. Verify `REDIS_HOST` and `REDIS_PASSWORD` in `.env`

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

