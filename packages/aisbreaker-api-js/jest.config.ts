//import type {Config} from 'jest';
import type { JestConfigWithTsJest as Config } from 'ts-jest'
//import { FailFastTestEnvironment } from 'aisbreaker-test-utils'

const config: Config = {
    "roots": [
        //"<rootDir>/src"
        //
        // .ts-compiling with ESM support not working correctly,
        // therefore build .ts files before running jest
        "<rootDir>/build"
    ],
    "testMatch": [
        "**/__tests__/**/*.+(ts|tsx|js)",
        "**/?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    /*
    "transform": {},
    */
    extensionsToTreatAsEsm: ['.ts'],
    "transform": {
        /*
        "^.+\\.(ts|tsx)$": "ts-jest",
        */
        '^.+\\.tsx?$': [
            'ts-jest',
            {
              useESM: true,
            },
        ],  
    },

    /*
    testEnvironment: 'node',
    testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
    */

    // configure test groups
    // differences between `runner` and `testRunner`: https://www.npmjs.com/package/jest-runner-groups#update-jest-config
    runner: 'groups',

    // Fast fail logic based on:
    //   "Jest should fail fast and exit early (change request for --bail)"
    //   https://github.com/jestjs/jest/issues/6527#issuecomment-1463950981
    //   https://github.com/jestjs/jest/issues/6527#issuecomment-760092817
    testRunner: 'jest-circus/runner',
    testEnvironment: '../../node_modules/aisbreaker-test-utils/build/FailFastTestEnvironment.js',
    reporters: [ 'default', 'jest-junit' ],
}

export default config
