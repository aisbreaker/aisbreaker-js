#!/bin/bash

# inspired by https://gist.github.com/mcollina/ba08a2e941e37a48a6f496e26f498607

VERSION=$1

if [[ -z "$VERSION" ]] ; then
  echo "ERROR: No new VERSION parameter specified."
  exit 1
fi

# get all modules/packages
MODULES=`node -e "console.log(require('./package.json').workspaces.join(' '))"`

# process all modules/packages
for MODULE in $MODULES; do
  echo "Building $MODULE"
  pushd $MODULE
  echo TODO npm version $VERSION 
    #--save
  NAME=`node -e "console.log(require('./package.json').name)"`
  echo $NAME
  popd
  echo TODO npm publish --workspace $MODULE
  echo TODO npm i --workspaces --save $NAME
done

# re-install with new/fresh versions
echo TODO rm -rf node_modules
echo TODO rm -rf packages/*/node_modules
echo TODO npm i
