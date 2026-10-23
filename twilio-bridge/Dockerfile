FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs safety-intents.cjs sales-intents.cjs support-intents.cjs ./
EXPOSE 8080
CMD ["node", "server.js"]
