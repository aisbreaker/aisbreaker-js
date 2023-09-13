#
# build stage
#
FROM node:lts-alpine as build-stage-container
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
# DEBUG - TODO REMOVE
#RUN ls -l node_modules
# replace symlinks from aisbreaker-* packages
RUN export VERSION=`cat VERSION` && \
    npm install "aisbreaker-api-js@${VERSION}" && \
    npm install "aisbreaker-core-nodejs@${VERSION}"
# DEBUG - TODO REMOVE
RUN ls -l node_modules
RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev
# DEBUG - TODO REMOVE
RUN ls -l node_modules

# Bundle app source
COPY . .

# compile TypeScript files
RUN npm run build

# cleaup
RUN rm -rf src


#
# production stage container (for webapp)
#
#    FROM nginx:stable-alpine as production-stage-container
#    # Install useful tools: bash, netcat, IP utils (incl. Ping), curl, vim
#    RUN apk --no-cache add \
#        bash \
#        curl \
#        iputils \
#        netcat-openbsd \
#        vim
#    # install vue app
#    COPY --from=build-stage-container /app/dist /usr/share/nginx/html
#    EXPOSE 80
#    CMD ["nginx", "-g", "daemon off;"]



#
# production stage container (for nodejs app)
#
FROM node:lts-alpine as production-stage-container
# Install useful tools: bash, netcat, IP utils (incl. Ping), curl, vim
RUN apk --no-cache add \
    bash \
    curl \
    iputils \
    netcat-openbsd \
    vim
# install vue app

# Create app directory
WORKDIR /app

# install nodejs app
COPY --from=build-stage-container /app /app/

EXPOSE 3000
ENTRYPOINT [ "node", "index.js" ]

