FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs orchestrator-voice-adapter.staging.cjs pma-adapter.cjs pma-profile.json pma-knowledge-v1.json pma-intents.cjs pma-intent-catalog-v1.json ./
COPY tests/staging-runner/support-orchestration-integration.staging.cjs ./tests/staging-runner/
COPY voice-entry.cjs voice-agent-routing.json voice-agent-catalog.json voice-system-prompts.json ./
EXPOSE 8080
CMD ["node", "server.js"]
