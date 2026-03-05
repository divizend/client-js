export class TradingError extends Error {
    constructor({ msg, code, brokerCode, brokerError, msgBrokerName, httpStatusCode, hint, }) {
        super(msg);
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain (https://stackoverflow.com/questions/41102060/typescript-extending-error-class)
        this.name = "TradingError";
        this.code = code;
        this.brokerCode = brokerCode;
        this.httpStatusCode = httpStatusCode || 500;
        this.brokerError = brokerError;
        this.msgBrokerName = msgBrokerName;
        this.hint = hint;
    }
}
export class BrokerizeError extends Error {
    constructor(statusCode, body) {
        super(body.msg);
        this.httpStatusCode = statusCode;
        this.name = "BrokerizeError";
        this.msg = body.msg;
        this.code = body.code;
        this.validationDetails = body.validationDetails;
        this.hint = body.hint;
        this.msgBrokerName = body.msgBrokerName;
    }
}
