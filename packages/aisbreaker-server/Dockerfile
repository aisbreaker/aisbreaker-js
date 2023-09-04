FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .


# DEBUG
RUN ls -l node_modules

RUN export VERSION=`cat VERSION` && \
    npm install "aisbreaker-api-js@${VERSION}" && \
    npm install "aisbreaker-core-nodejs@${VERSION}"

RUN ls -l node_modules



# Compile TypeScript files
RUN npm run build

EXPOSE 3000
ENTRYPOINT [ "node", "build/index.js" ]
