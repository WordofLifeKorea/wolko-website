FROM node:24-alpine
WORKDIR /app
COPY server.mjs ./server.mjs
USER node
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server.mjs"]
