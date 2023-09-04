#!/bin/bash

# get all modules/packages (should be defined in the order from no-inter-dependency to max-inter-dependencies)
MODULES=`node -e "console.log(require('./package.json').workspaces.join(' '))"`
echo "MODULES=$MODULES"

# build and (if present) test all packages
#
# CANNOT USE "npm run build --workspaces" or "npm run test --workspaces --if-present"
#    because it would not fail on errors (https://github.com/npm/rfcs/issues/575)
for MODULE in $MODULES; do
  echo "--- Build+Test: $MODULE (if-present)"
  pushd $MODULE
  npm run build --if-present || exit 1
  npm run test --if-present || exit 1
  popd
done

