#
# build stage container
#
FROM node:lts-alpine as build-stage-container
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json VERSION ./
# DEBUG - TODO REMOVE
#RUN ls -l node_modules
# replace symlinks from aisbreaker-* packages
RUN export VERSION=`cat VERSION` && \
    echo "V=${VERSION}" && set -x && ls -l && \
    npm install --d "aisbreaker-api-js@${VERSION}" && \
    npm install --d "aisbreaker-core-nodejs@${VERSION}"
# DEBUG - TODO REMOVE
RUN ls -l node_modules
RUN npm install --d
# If you are building your code for production
# RUN npm ci --omit=dev
# DEBUG - TODO REMOVE
RUN ls -l node_modules

# Bundle app source
COPY . .

# compile TypeScript files
RUN npm run build

# cleaunp
RUN rm -rf src


#
# production stage container (for nodejs/express app)
#
FROM node:lts-alpine as production-stage-container

# Install useful tools: bash, netcat, IP utils (incl. Ping), curl, vim
RUN apk --no-cache add \
    bash \
    curl \
    iputils \
    netcat-openbsd \
    vim

# Create app directory
WORKDIR /app

# Install nodejs/express app
COPY --from=build-stage-container /app /app/

EXPOSE 3000
ENTRYPOINT [ "node", "build/index.js" ]
