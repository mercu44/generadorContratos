FROM node:24-bookworm-slim
ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium CHROMIUM_NO_SANDBOX=true NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node contratos-backend ./contratos-backend
COPY --chown=node:node contratos-frontend/login.html contratos-frontend/index.html contratos-frontend/crear.html contratos-frontend/editar.html contratos-frontend/scripts.js contratos-frontend/styles.css ./contratos-frontend/
COPY --chown=node:node contrato.html ./
USER node
EXPOSE 3000
CMD ["node", "contratos-backend/server.js"]
