#!/bin/bash

# Set the provided version argument in all modules/packages (everywhere it's needed)
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

# preparation: build and (if present) test all packages
./build-all-packages.sh || exit 1

# update version in all modules/packages
./set-version-in-all-packages.sh "$VERSION"

