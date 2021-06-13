FROM node:lts-alpine
ARG PORT=4000
ENV PORT $PORT
ARG RECEIVER_URL
ENV RECEIVER_URL $RECEIVER_URL
EXPOSE $PORT
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn build
CMD ["backend/index.js"]
ENTRYPOINT ["node"]
