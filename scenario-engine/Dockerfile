FROM node:lts-alpine
ARG PORT=5200
ENV PORT $PORT
ARG BACKEND_HOST
ENV BACKEND_HOST $BACKEND_HOST
EXPOSE $PORT
WORKDIR /app
COPY . .
RUN yarn init -y
RUN yarn add express axios sockjs
CMD ["index.js"]
ENTRYPOINT ["node"]
