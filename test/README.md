Server Integration Tests: Test AIsBreaker API Client and (Demo) Server together
===============================================================================

Configuration (environment variables), e.g. to configure in CI environment:
- AISBREAKER_SERVER_URL (optional, default: http://localhost:3000)
- AISBREAKER_API_KEY
- OPENAI_API_KEY
e.g. with
```bash
. ./setenv-for-localhost-server-integration-tests.sh
```

Run all tests:
```bash
./server-integration-tests.sh
```
