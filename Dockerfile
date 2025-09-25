FROM us-docker.pkg.dev/gemini-code-dev/gemini-cli/sandbox:0.1.21

WORKDIR /app

# Ensure the current user owns /app
USER root
RUN mkdir -p /app && chown -R node:node /app
USER node

# Copy only package files and install deps
COPY --chown=node:node package*.json ./

# Copy source
COPY --chown=node:node . .

RUN npm install

RUN npm run build

RUN npm install -g
