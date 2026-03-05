import { ErrorResponse, ValidationDetail } from "./swagger";
export declare class TradingError extends Error {
    code?: string;
    brokerCode?: string | number;
    brokerError?: any;
    httpStatusCode: number;
    /**
     * If set, indicates that the `msg` can be attributed to the given broker directly (for example
     * it is not a networking problem).
     */
    msgBrokerName?: string;
    hint?: Hint;
    constructor({ msg, code, brokerCode, brokerError, msgBrokerName, httpStatusCode, hint, }: ErrorParams);
}
export type ErrorParams = {
    msg: string;
    code?: string;
    brokerCode?: string | number;
    brokerError?: any;
    httpStatusCode?: number;
    msgBrokerName?: string;
    hint?: Hint;
};
export type Hint = {
    id: string;
    text: string;
};
export declare class BrokerizeError extends Error {
    /**
     *
     * @type {{ [key: string]: FieldErrorsValue; }}
     * @memberof ErrorResponse
     */
    validationDetails?: {
        [key: string]: ValidationDetail;
    };
    /**
     *
     * @type {Hint}
     * @memberof ErrorResponse
     */
    hint?: Hint;
    /**
     *
     * @type {string}
     * @memberof ErrorResponse
     */
    msgBrokerName?: string;
    /**
     * The human-readable error message. If available, translated to the users's language.
     * This can always be displayed in frontends (if no specific error code handling is available).
     * @type {string}
     * @memberof ErrorResponse
     */
    msg: string;
    /**
     * The error code.
     * Currently the following codes are implemented:
     * 'TRADING_ERROR', 'AUTH', 'RATE_LIMITED', 'VALIDATION_FAILED', 'MUST_ACCEPT_HINT', 'NO_SESSION_AVAILABLE_FOR_PORTFOLIO',
     *  'SECURITY_NOT_FOUND', 'SECURITY_NOT_TRADABLE_AT_EXCHANGE', 'ORDER_REJECTED', 'INTERNAL_SERVER_ERROR'
     * @type {string}
     * @memberof ErrorResponse
     */
    code: string;
    httpStatusCode: number;
    constructor(statusCode: number, body: ErrorResponse);
}
