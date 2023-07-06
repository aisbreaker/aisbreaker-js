#!/bin/bash

# Build all modules/packages and set the provided VERSION argument everywhere it's needed
#
# Some limitations of npm workspaces CLI (as of 2023-07-06):
# - npm --workspaces version doesn't update dependencies
#   - https://github.com/npm/cli/issues/3403 (issue closed, but problem not solved?)
#   - to solve this problem we patch package*json files with sed (dirty hack) 
#   - an alternative solution could be https://github.com/npm/cli/issues/3403
# - individual pageages have no package-lock.json, there is only one in the top level dir
#   - https://github.com/npm/feedback/discussions/650
#   - https://stackoverflow.com/questions/74906173/package-lock-json-in-npm-workspaces
#
# Base idea of the script inspired by https://gist.github.com/mcollina/ba08a2e941e37a48a6f496e26f498607


# command line argument
export VERSION=$1
if [[ -z "$VERSION" ]] ; then
  echo "ERROR: No new VERSION parameter specified."
  exit 1
fi

# definition of helpers: silent pushd + popd
pushd () {
    command pushd "$@" > /dev/null
}
popd () {
    command popd "$@" > /dev/null
}


# get all modules/packages (should be defined in the order from no-inter-dependency to max-inter-dependencies)
MODULES=`node -e "console.log(require('./package.json').workspaces.join(' '))"`
echo "MODULES=$MODULES"

# preparation: build and (if present) test all packages
./build-all-packages.sh || exit 1
echo "sleep 3"
sleep 3


# update version in all modules/packages
NPM_VERSION_OPT="--no-git-tag-version"
#NPM_VERSION_OPT=""
echo "- Set version in top module"
npm version $VERSION $NPM_VERSION_OPT || exit 1

echo "-- Set version in sub modules/packages"
for MODULE in $MODULES; do
  echo "--- Set version + publish: $MODULE"
  pushd $MODULE
  export NAME=`node -e "console.log(require('./package.json').name)"`

  # update version
  echo "Set version of $NAME in $MODULE"
  #npm version $VERSION $NPM_VERSION_OPT || exit 1
  ls ./package*json | xargs -n 1 sed "s/\"version\": \".*\"/\"version\": \"$VERSION\"/g" -i 
  popd

  # update dependencies in all modules
  for MOD in $MODULES; do
    echo "Set dependency-version of $NAME in $MOD"
    ls $MOD/package*json | xargs -n 1 sed "s/\"$NAME\": \".*\"/\"$NAME\": \"^$VERSION\"/g" -i 
  done

  # publish
  echo "Publish now: $NAME"
  npm publish --workspace $MODULE
  #npm install --workspaces $NAME
  echo ""
  sleep 3
done

echo "sleep 5"
sleep 5

# re-install with new/fresh versions
echo "-- Re-install with new/fresh versions"
rm -rf node_modules
rm -rf packages/*/node_modules
npm install

