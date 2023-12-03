
# read secrets
OPENAI_API_KEY=`bash -c '. ../../setenv.sh > /dev/null; echo ${OPENAI_API_KEY}'`
HUGGINGFACE_API_KEY=`bash -c '. ../../setenv.sh > /dev/null; echo ${HUGGINGFACE_API_KEY}'`
AISBREAKER_API_KEY_localhost_3000=`bash -c '. ../../setenv.sh > /dev/null; echo ${AISBREAKER_API_KEY_localhost_3000}'`

# re-export
export AISBREAKER_SERVER_URL="http://localhost:3000"
export AISBREAKER_API_KEY="${AISBREAKER_API_KEY_localhost_3000}"
export OPENAI_API_KEY

