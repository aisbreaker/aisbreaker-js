//
// polyfil for assert module of nodejs
// to be able to run in brwosers, too
//
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
//

class AssertionError extends Error {
    actual: unknown;
    expected: unknown;
    operator: string;
    generatedMessage: boolean;
    code: 'ERR_ASSERTION';
    constructor(options?: {
        /** If provided, the error message is set to this value. */
        message?: string | undefined;
        /** The `actual` property on the error instance. */
        actual?: unknown | undefined;
        /** The `expected` property on the error instance. */
        expected?: unknown | undefined;
        /** The `operator` property on the error instance. */
        operator?: string | undefined;
        /** If provided, the generated stack trace omits frames before this function. */
        // tslint:disable-next-line:ban-types
        stackStartFn?: Function | undefined;
    }) {
        super(options?.message ?? 'Failed');
        this.actual = options?.actual;
        this.expected = options?.expected;
        this.operator = options?.operator ?? 'fail';
        this.generatedMessage = options?.message === undefined;
        this.code = 'ERR_ASSERTION';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, options?.stackStartFn /*?? fail*/);
        }
    }
}

/*
export function assert(value: boolean, message?: string | Error): asserts value {
    if (!value) {
        const m = message ? ""+message : "assert() failed"
        throw new AssertionError({ message: m })
    } 
}
*/

export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new AssertionError({message: msg || "assert() failed"});
    }
}