/** A signal object that allows you to communicate with a DOM request (such as a Fetch) and abort it if required via an AbortController object. */
export declare interface AbortSignal {
    /**
     * Returns true if this AbortSignal's AbortController has signaled to abort, and false otherwise.
     */
    readonly aborted: boolean;
    addEventListener(eventName: "abort", listener: () => any): void;
    removeEventListener(eventName: "abort", listener: () => any): void;
}
export type WhatWgAbortSignal = {
    prototype: AbortSignal;
    new (): AbortSignal;
};
