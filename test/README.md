Server Integration Tests: Test AIsBreaker API Client and (Demo) Server together
===============================================================================

Configuration (environment variables), e.g. to configure in CI environment:
- AISBREAKER_SERVER_URL (optional, default: http://localhost:3000)
- AISBREAKER_API_KEY
- OPENAI_API_KEY
e.g. with
```bash
. ./setenv-for-localhost-server-integration-tests.sh
# don't forget to start the server on http://localhost:3000
```
or with
```bash
. ./setenv-for-dev-server-integration-tests.sh
# make sure the verserver runs on https://api.demo.app-dev.cloud.service01.net
```

Run all tests:
```bash
./server-integration-tests.sh
```
