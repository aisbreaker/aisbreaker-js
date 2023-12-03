
# read secrets
OPENAI_API_KEY=`bash -c '. ../../setenv.sh > /dev/null; echo ${OPENAI_API_KEY}'`
HUGGINGFACE_API_KEY=`bash -c '. ../../setenv.sh > /dev/null; echo ${HUGGINGFACE_API_KEY}'`
AISBREAKER_API_KEY_dev=`bash -c '. ../../setenv.sh > /dev/null; echo ${AISBREAKER_API_KEY_dev}'`

# re-export
export AISBREAKER_SERVER_URL="https://api.demo.app-dev.cloud.service01.net"
export AISBREAKER_API_KEY="${AISBREAKER_API_KEY_dev}"
export OPENAI_API_KEY

