FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs orchestrator-voice-adapter.staging.cjs ./
COPY tests/staging-runner/support-orchestration-integration.staging.cjs ./tests/staging-runner/
EXPOSE 8080
CMD ["node", "server.js"]
