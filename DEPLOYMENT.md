# Docker Deployment

This project includes Docker support for easy deployment.

## Quick Start

### Using Docker Compose (Recommended)

1. Ensure you have a `config.json` file in the project root:
   ```bash
   # Edit config.json with your settings
   nano config.json
   ```

2. Run the application:
   ```bash
   docker-compose up -d
   ```

The application will be available at http://localhost:3000

### Using Docker directly

1. Build the image:
   ```bash
   docker build -t jitsi-test-lab .
   ```

2. Run the container:
   ```bash
   # With default config (uses config.json from build)
   docker run -p 3000:80 jitsi-test-lab
   
   # With custom config file
   docker run -p 3000:80 -v $(pwd)/config.json:/usr/share/nginx/html/config.json:ro jitsi-test-lab
   
   # With config from different location
   docker run -p 3000:80 -v /path/to/your/config.json:/usr/share/nginx/html/config.json:ro jitsi-test-lab
   ```

### Using pre-built image from Docker Hub

```bash
# Pull and run latest image with custom config
docker run -p 3000:80 -v $(pwd)/config.json:/usr/share/nginx/html/config.json:ro your-dockerhub-username/jitsi-test-lab:latest
```

## Configuration

The Docker container serves the built static files and expects a `config.json` file to be available at the webroot. You can:

1. **Mount custom config** (recommended): Mount your `config.json` file as a volume to override the built-in config
2. **Use built-in config**: The container includes the project's `config.json` as the default configuration

## Environment Variables

The container doesn't require environment variables, but you can customize nginx behavior by mounting a custom nginx config.

## Ports

- **80**: Main HTTP port (maps to container port 80)

## Health Check

The container includes a health check that verifies the web server is responding on port 80.

## Building for Production

The Docker image:
1. Uses multi-stage build for smaller final image
2. Builds the app with `npm run build`
3. Serves static files with nginx
4. Includes proper caching headers for static assets
5. Supports SPA routing
6. Serves `config.json` with no-cache headers for runtime updates