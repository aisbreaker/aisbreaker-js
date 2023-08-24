//
// re-export all relevant classes/interfaces of this package
//

/*
export * from './api/index.js'
export * from './base/index.js'
export * from './services/index.js'
export * from './utils/index.js'
*/

export * as api from './api/index.js'
export * as base from './base/index.js'
export * as extern from './extern/index.js'
export * as services from './services/index.js'
export * as utils from './utils/index.js'



//
// module initialization
//

/**
 * Function to enforce initialization of this module
 * and all its dependencies
 */
export async function init(): Promise<void> {
  console.log('aisbreaker-api-js: init()')
}
