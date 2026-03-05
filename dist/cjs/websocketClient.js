"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrokerizeWebSocketClientImpl = void 0;
const LOG_PREFIX = "[brokerize WebSocketClient] ";
class BrokerizeWebSocketClientImpl {
    constructor(websocketUrl, auth, createWebSocket) {
        this._map = {};
        this._authenticatedCallback = null;
        this._disconnectTimeout = null;
        this._isOpen = false;
        this._fatalError = null;
        this._lastNonFatalError = null;
        this._errorCount = 0;
        this._apiCtx = null;
        this._url = websocketUrl;
        this._id = 0;
        this._socket = null;
        this._pingIntvl = null;
        this._updateReconnectInterval();
        this._auth = auth;
        this._createWebsocket = createWebSocket;
    }
    _updateReconnectInterval() {
        if (this._reconnectIntvl) {
            clearInterval(this._reconnectIntvl);
        }
        if (this._fatalError) {
            return;
        }
        this._reconnectIntvl = setInterval(() => {
            if (!this._socket && this._shouldConnect()) {
                if (this._errorCount > 0) {
                    console.warn(LOG_PREFIX +
                        "reconnecting. current error count is " +
                        this._errorCount +
                        ". the last error was: ", this._lastNonFatalError);
                }
                this._connect();
            }
        }, this._computeReconnectIntervalInMilliseconds(this._errorCount));
    }
    /**
     * Simple backoff behavior: first retry is fast (100ms), next 9 retries 1s, after that we only reconnect every 10s.
     */
    _computeReconnectIntervalInMilliseconds(errorCount) {
        if (errorCount == 0) {
            return 100;
        }
        else if (errorCount < 10) {
            return 1000;
        }
        else {
            return 10000;
        }
    }
    _shouldConnect() {
        var _a;
        if (this._fatalError) {
            return false;
        }
        for (const k in this._map) {
            if (((_a = this._map[k].callbacks) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                return true;
            }
        }
        return false;
    }
    subscribe(cmd, callback) {
        if (this._fatalError) {
            // no more subscriptions on a websocket client that has a fatal error
            callback(this._fatalError, null);
            return {
                unsubscribe: () => { },
            };
        }
        const key = JSON.stringify(cmd);
        const wrappedCb = (err, data) => callback(err, data);
        if (!this._map[key]) {
            this._map[key] = {
                callbacks: [wrappedCb],
                idOnSocket: null,
                interrupted: false,
            };
        }
        else {
            this._map[key].callbacks.push(wrappedCb);
        }
        if (this._map[key].callbacks.length == 1) {
            /* first subscriber must start it */
            this._startSubscription(key);
        }
        this._startOrStopDisconnectTimeout();
        let unsub = false;
        return {
            unsubscribe: () => {
                if (unsub) {
                    return;
                }
                unsub = true;
                this._map[key].callbacks = this._map[key].callbacks.filter((cb) => cb != wrappedCb);
                if (this._map[key].callbacks.length == 0) {
                    this._endSubscription(key);
                }
                this._startOrStopDisconnectTimeout();
            },
        };
    }
    subscribeInvalidate(subscribe, callback) {
        const cmd = Object.assign({ cmd: "subscribe", type: "invalidate", subscriptionId: null }, subscribe);
        return this.subscribe(cmd, callback);
    }
    subscribeDecoupledOperation(subscribe, callback) {
        const cmd = Object.assign({ cmd: "subscribe", type: "decoupledOperationStatus", subscriptionId: null }, subscribe);
        return this.subscribe(cmd, callback);
    }
    _startSubscription(key) {
        var _a;
        if (this._fatalError) {
            this._notifySubscribersAboutFatalError(key);
            return;
        }
        if (((_a = this._socket) === null || _a === void 0 ? void 0 : _a.readyState) == 1 && this._isOpen) {
            this._id++;
            this._map[key].idOnSocket = this._id;
            const cmd = JSON.parse(key);
            cmd.subscriptionId = this._id;
            this._sendWs(cmd, true);
            if (this._map[key].interrupted) {
                this._map[key].interrupted = false;
                this._fillInMessagesAfterConnectionInterruption(cmd, this._map[key].callbacks);
            }
        }
        else if (!this._socket) {
            this._connect();
        }
    }
    _fillInMessagesAfterConnectionInterruption(cmd, callbacks) {
        if (cmd.type == "invalidate") {
            const assumedInvalidate = {
                cmd: "invalidate",
                subscriptionId: cmd.subscriptionId,
            }; // minimal invalidate
            console.log(LOG_PREFIX +
                "connection was interrupted. filling in assumed invalidates that may have happened while socket was not available.");
            callbacks.forEach((cb) => cb(null, assumedInvalidate));
        }
        else if (cmd.type == "decoupledOperationStatus") {
            if (this._apiCtx) {
                this._apiCtx
                    .getDecoupledOperationStatus({
                    decoupledOperationId: cmd.decoupledOperationId,
                })
                    .then((status) => {
                    const invMsg = {
                        cmd: "updateDecoupledOperationStatus",
                        status: status,
                        subscriptionId: cmd.subscriptionId,
                    };
                    console.log(LOG_PREFIX +
                        "sending virtual decoupled operation status updates to subscribers due to connection interruption.");
                    callbacks.forEach((cb) => cb(null, invMsg));
                }, (err) => {
                    console.log(err, LOG_PREFIX +
                        "could not retrieve status of decoupledOperation. ignoring it.");
                });
            }
        }
    }
    _endSubscription(key) {
        if (this._map[key].idOnSocket != null) {
            this._sendWs({
                cmd: "unsubscribe",
                subscriptionId: this._map[key].idOnSocket,
            }, true);
            this._map[key].idOnSocket = null;
        }
    }
    /**
     * Internal method for setting a related AuthorizedApiContext. This is used to retrieve
     * decoupled operation status on interrupted connections.
     */
    _setAuthorizedApiContext(ctx) {
        this._apiCtx = ctx;
    }
    _startOrStopDisconnectTimeout() {
        if (this._shouldConnect()) {
            if (this._disconnectTimeout) {
                clearTimeout(this._disconnectTimeout);
                this._disconnectTimeout = null;
            }
        }
        else if (!this._disconnectTimeout) {
            // if there is no subscription open for 3s, disconnect from WebSocket
            this._disconnectTimeout = setTimeout(() => {
                var _a;
                if (!this._shouldConnect()) {
                    (_a = this._socket) === null || _a === void 0 ? void 0 : _a.close();
                    this._socket = null;
                    this._disconnectTimeout = null;
                }
            }, 3000);
        }
    }
    _sendWs(data, doConnect = false) {
        var _a, _b;
        if (!this._socket && doConnect) {
            this._connect();
        }
        if (((_a = this._socket) === null || _a === void 0 ? void 0 : _a.readyState) == 1) {
            (_b = this._socket) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify(data));
        }
        else {
            console.log(LOG_PREFIX + "socket not ready, not sending message.", this._lastNonFatalError, this._fatalError);
        }
    }
    _connect() {
        if (this._socket) {
            this._isOpen = false;
            this._socket.close();
        }
        if (this._fatalError) {
            // no more connections on a websocket client that has a fatal error
            return;
        }
        this._authenticatedCallback = null;
        this._socket = this._createWebsocket(this._url);
        this._socket.onmessage = (msg) => {
            var _a;
            const message = JSON.parse(msg.data);
            if (message.subscriptionId) {
                /* message concerns a subscription */
                if (message.cmd == "invalidate") {
                    const entry = this._findSubscriptionEntry(message.subscriptionId);
                    entry === null || entry === void 0 ? void 0 : entry.entry.callbacks.forEach((cb) => cb(null, message));
                }
                else if (message.cmd ==
                    "updateDecoupledOperationStatus") {
                    const entry = this._findSubscriptionEntry(message.subscriptionId);
                    entry === null || entry === void 0 ? void 0 : entry.entry.callbacks.forEach((cb) => cb(null, message));
                }
                else if (message.error) {
                    /* error on subscription */
                    const entry = this._findSubscriptionEntry(message.subscriptionId);
                    entry === null || entry === void 0 ? void 0 : entry.entry.callbacks.forEach((cb) => cb(message, null));
                }
            }
            else if (message.cmd == "authenticated") {
                this._authenticatedCallback && this._authenticatedCallback();
                this._authenticatedCallback = null;
            }
            else if (message.cmd == "ping") {
                // NOP
            }
            else if (message) {
                const e = message;
                if (((_a = e.error) === null || _a === void 0 ? void 0 : _a.message) == "authentication failed") {
                    // we treet authentication failed as a fatal error, this should just not happen if the client creates
                    // the websocket client correctly. If it happens, applications will have to create a new instance.
                    this._handleFatalError(e);
                }
                else {
                    this._handleNonFatalError(e);
                }
            }
        };
        this._socket.onopen = () => {
            Promise.resolve(this._auth.getToken()).then((token) => {
                const _authCb = () => {
                    this._isOpen = true;
                    this._resetErrorState();
                    for (const k in this._map) {
                        this._startSubscription(k);
                    }
                };
                if (token) {
                    this._sendWs({
                        cmd: "authorize",
                        idToken: token.idToken,
                    }, true);
                    this._authenticatedCallback = _authCb;
                }
                else {
                    _authCb();
                }
            }, (err) => {
                console.error(LOG_PREFIX + " connection failed", err);
            });
        };
        this._socket.onclose = () => {
            // mark all subscriptions interrupted so they can issue synthetic messages on reconnect
            for (const k in this._map) {
                this._map[k].interrupted = true;
                this._endSubscription(k);
            }
            this._socket = null;
        };
        this._pingIntvl && clearInterval(this._pingIntvl);
        this._pingIntvl = setInterval(() => {
            var _a, _b, _c;
            // 2: CLOSING, 3: CLOSED
            if (((_a = this._socket) === null || _a === void 0 ? void 0 : _a.readyState) == 2 ||
                (((_b = this._socket) === null || _b === void 0 ? void 0 : _b.readyState) == 3 && this._shouldConnect())) {
                this._connect();
                return;
            }
            if (((_c = this._socket) === null || _c === void 0 ? void 0 : _c.readyState) == 1) {
                // open
                this._sendWs({
                    cmd: "ping",
                });
            }
        }, 30000);
    }
    /**
     * Error happend when trying to connect, but it may be solved by trying a reconnect later.
     */
    _handleNonFatalError(e) {
        this._errorCount++;
        this._lastNonFatalError = e;
        this._updateReconnectInterval();
    }
    /**
     * Fatal error: this means the client is unusable from now on and must be recreated.
     */
    _handleFatalError(e) {
        this._fatalError = e;
        this._updateReconnectInterval();
        this._pingIntvl && clearInterval(this._pingIntvl);
        for (const key in this._map) {
            this._notifySubscribersAboutFatalError(key);
        }
    }
    /**
     * If a fatal error occurs, all registered callbacks must be called with the error parameter.
     */
    _notifySubscribersAboutFatalError(key) {
        this._map[key].callbacks.forEach((cb) => {
            try {
                cb(this._fatalError, null);
            }
            catch (err) {
                console.warn(LOG_PREFIX + "error in callback", err);
            }
        });
    }
    /**
     * Once we have successfully established a connection, error counts and states must be reset.
     */
    _resetErrorState() {
        this._lastNonFatalError = null;
        this._errorCount = 0;
        this._updateReconnectInterval();
    }
    _findSubscriptionEntry(subscriptionId) {
        for (const k in this._map) {
            if (this._map[k].idOnSocket == subscriptionId) {
                return { key: k, entry: this._map[k] };
            }
        }
        return null;
    }
}
exports.BrokerizeWebSocketClientImpl = BrokerizeWebSocketClientImpl;
