FROM node:16.15.0-alpine3.15 AS development
WORKDIR /media/takashitanaka/DATA/node/horas/server
COPY package*.json ./
RUN npm install --only=development
COPY . .
RUN npm run build
FROM node:16.15.0-alpine3.15 AS production
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
WORKDIR /media/takashitanaka/DATA/node/horas/server
COPY package*.json ./
RUN npm install --only=production --omit=dev
COPY --from=development /media/takashitanaka/DATA/node/horas/server/dist ./dist
CMD ["npm", "run", "start:dev:core"]