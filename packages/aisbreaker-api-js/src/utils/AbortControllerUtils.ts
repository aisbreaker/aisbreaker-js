
/**
 * Create a second Abortcontroller, if a seconds party wants to be able to abort
 * 
 * @param abortSignal    the signal of the first AbortController
 * @returns 
 */
export function createSecondAbortControllerFromAbortController(
  firstAbortSignal?: AbortSignal | undefined
): AbortController {

  const secondAbortController = new AbortController()
  if (!firstAbortSignal) {
    // trivial case
    return secondAbortController
  } else {
    // combine 1st signal und second controller
    firstAbortSignal.addEventListener('abort', () => {
      secondAbortController.abort()
    })
    return secondAbortController
  }
}
