# Use NodeJS LTS Slim image
FROM node:lts-slim

# Create app directory 
WORKDIR /app
VOLUME /app/data

# Install app dependencies
COPY package.json ./
RUN npm install

# Define env variables
ENV TOKEN=""
ENV DISABLE_SPIN="false"
ENV DISABLE_DAILY="false"
ENV DISABLE_BULLET="false"

# Copy remaning files
COPY . .

# Run JS file with Node
CMD [ "node", "index.js" ]

# How to run:
# docker build . -t lando/claim_gc
# docker run -d --restart unless-stopped --name claim_gc -e TOKEN=<gclubsess> -e DISABLE_SPIN=true -v $(pwd)/data:/app/data lando/claim_gc
