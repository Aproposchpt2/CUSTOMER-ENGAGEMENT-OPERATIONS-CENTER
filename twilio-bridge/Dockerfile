FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs orchestrator-voice-adapter.staging.cjs pma-adapter.cjs pma-availability.cjs pma-profile.json pma-knowledge-v1.json pma-intents.cjs pma-intent-catalog-v1.json ./
COPY tests/staging-runner/support-orchestration-integration.staging.cjs ./tests/staging-runner/
COPY voice-entry.cjs voice-agent-routing.json voice-agent-catalog.json voice-system-prompts.json ./
COPY voice-receptionist.cjs stellar-conversational-persona.cjs ./
COPY staging-runtime-config.cjs ./
COPY voice-agent-catalog-expanded.json stellar-kb-v1.json specialist-staging.cjs staging-knowledge-policy.cjs safety-intents.cjs support-intelligence.cjs support-intent-catalog-v1.json latency-logger.js voice-quality-analyzer.js ./
EXPOSE 8080
CMD ["node", "server.js"]
