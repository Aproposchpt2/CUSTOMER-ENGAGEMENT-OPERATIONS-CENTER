FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js staging-support-intake.cjs pma-adapter.cjs pma-profile.json ./
EXPOSE 8080
CMD ["node", "server.js"]
