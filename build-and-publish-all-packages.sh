#!/bin/bash

# Build all modules/packages.
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


# publish all modules/packages
NPM_VERSION_OPT="--no-git-tag-version"
#NPM_VERSION_OPT=""

echo "-- Publish modules/packages"
for MODULE in $MODULES; do
  echo "--- Publish: $MODULE"

  # publish
  npm publish --workspace $MODULE || exit 1
  #npm install --workspaces $NAME
  echo ""
  sleep 3
done

