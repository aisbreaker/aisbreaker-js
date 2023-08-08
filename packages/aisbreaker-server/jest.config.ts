//import type {Config} from 'jest';
import type { JestConfigWithTsJest as Config } from 'ts-jest'

const config: Config = {
    "roots": [
        "<rootDir>/src"
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
}

export default config
