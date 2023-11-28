// Fast fail logic based on:
//   "Jest should fail fast and exit early (change request for --bail)"
//   https://github.com/jestjs/jest/issues/6527#issuecomment-1463950981
//   https://github.com/jestjs/jest/issues/6527#issuecomment-760092817

import type { Circus, } from "@jest/types"
import { TestEnvironment, } from "jest-environment-node"
// import TestEnvironment from "jest-environment-jsdom"

class FailFastTestEnvironment extends TestEnvironment
{
  failedTest = false

  async handleTestEvent(
    event: Circus.Event,
    state: Circus.State,
  )
  {
    if ( event.name === "hook_failure" || event.name === "test_fn_failure" )
    {
      this.failedTest = true
    } else if ( this.failedTest && event.name === "test_start" )
    {
      event.test.mode = "skip"
    }

    // @ts-ignore
    if ( super.handleTestEvent ) await super.handleTestEvent( event, state, )
  }
}

export default FailFastTestEnvironment
