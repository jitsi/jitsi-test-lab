# Build stage
from node:18-alpine as build

workdir /app

# Copy package files
copy package*.json ./

# Install dependencies
run npm ci

# Copy source code
copy . .

# Build the application
run npm run build

# Production stage
from nginx:alpine

# Copy built files to nginx
copy --from=build /app/dist /usr/share/nginx/html

# Copy default config.json to web directory
copy --from=build /app/config.json /usr/share/nginx/html/config.json

# Create custom nginx config to handle SPA routing
run echo 'server {\
    listen 80;\
    server_name localhost;\
    root /usr/share/nginx/html;\
    index index.html;\
    \
    # Handle SPA routing - try files then fallback to index.html\
    location / {\
        try_files $uri $uri/ /index.html;\
    }\
    \
    # Serve config.json with no caching to allow runtime updates\
    location /config.json {\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\
        add_header Pragma "no-cache";\
        add_header Expires "0";\
        try_files $uri =404;\
    }\
    \
    # Cache static assets\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {\
        expires 1y;\
        add_header Cache-Control "public, immutable";\
    }\
}' > /etc/nginx/conf.d/default.conf

expose 80

cmd ["nginx", "-g", "daemon off;"]
