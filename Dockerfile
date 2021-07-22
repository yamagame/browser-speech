FROM node:lts-alpine
ARG PORT=4000
ENV PORT $PORT
ARG SCENARIO_MANAGER_HOST
ENV SCENARIO_MANAGER_HOST $SCENARIO_MANAGER_HOST
EXPOSE $PORT
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn build
CMD ["backend.js"]
ENTRYPOINT ["node"]
