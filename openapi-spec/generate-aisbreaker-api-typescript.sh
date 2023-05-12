#!/bin/bash

OPENAPI_FILE=aisbreaker-openapi-spec.yml 
GENERATED_TMP_DIR=./tmp
GENERATED_DIR=../src/api/generated

# check that I'm in the script directory
if [ ! -f "${OPENAPI_FILE}" ]; then
    echo "Please run this script from the directory of ${OPENAPI_FILE}"
    exit 1
fi

# preparation
set -v
rm -rf   "${GENERATED_TMP_DIR}"
mkdir -p "${GENERATED_TMP_DIR}"
rm -rf   "${GENERATED_DIR}"
mkdir -p "${GENERATED_DIR}/models"

# generate the typescript code
npx @openapitools/openapi-generator-cli generate -i "${OPENAPI_FILE}" -g typescript -o "${GENERATED_TMP_DIR}"

# copy only relevant files
cp "${GENERATED_TMP_DIR}"/models/*.ts "${GENERATED_DIR}/models/"

# copy helper
cp -R templates/http "${GENERATED_DIR}/"

# cleanup
rm -rf "${GENERATED_TMP_DIR}"
