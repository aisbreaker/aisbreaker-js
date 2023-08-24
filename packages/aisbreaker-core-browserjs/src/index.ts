//
// re-export all relevant classes/interfaces of this package
//

/*
export * from './services/index.js'
export * from './utils/index.js'
*/


//
// re-export all relevant classes/interfaces of aisbreaker-api-js
// DON'T DO THIS, as long we cannot merge modules with the same name
//
//export * from 'aisbreaker-api-js'



//
// module initialization
//
import * as apiJs from 'aisbreaker-api-js'

/**
 * Function to enforce initialization of this module
 * and all its dependencies
 */
export async function init(): Promise<void> {
  await apiJs.init()
  console.log('aisbreaker-core-browser: init()')
}

