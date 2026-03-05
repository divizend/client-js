/**
 * Polls the given `fetchData` function at regular intervals, with a delay of `intvlMs` ms between each call.
 * Calls `callback` with the result of `fetchData` on each call. Stops polling when `unsubscribe` is called.
 * When `fetchData` throws an error, it is passed to `callback` and polling stops (!). I.e. once the callback
 * receives an error, it should be reported back.
 *
 * @param fetchData the function to fetch data
 * @param intvlMs the delay between each call to `fetchData`
 * @param callback the function to call with the result of `fetchData`
 * @returns a subscription object to unsubscribe from
 */
export declare function createPollingSubscription<T>(fetchData: () => Promise<T>, intvlMs: number, callback: (err: Error | undefined, data: T | undefined) => void): {
    unsubscribe(): void;
};
