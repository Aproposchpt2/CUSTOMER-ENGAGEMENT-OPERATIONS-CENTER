FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs stellar-kb-v1.json voice-agent-catalog.json voice-intent-search.cjs approved-staging-knowledge.cjs intent-candidate-gate.cjs ./
EXPOSE 8080
CMD ["node", "server.js"]
