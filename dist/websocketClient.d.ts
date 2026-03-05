import { Auth } from "./apiCtx";
import { AuthorizedApiContext } from "./authorizedApiContext";
import { WebSocket } from "./dependencyDefinitions/webSocket";
import type { SubscribeDecoupledOperation, SubscribeInvalidateDetails } from "./websocketTypes";
export declare class BrokerizeWebSocketClientImpl implements BrokerizeWebSocketClient {
    private _url;
    private _map;
    private _id;
    private _socket;
    private _pingIntvl;
    private _reconnectIntvl;
    private _authenticatedCallback;
    private _disconnectTimeout;
    private _isOpen;
    private _auth;
    private _createWebsocket;
    private _fatalError;
    private _lastNonFatalError;
    private _errorCount;
    private _apiCtx;
    constructor(websocketUrl: string, auth: Auth, createWebSocket: (url: string) => WebSocket);
    private _updateReconnectInterval;
    /**
     * Simple backoff behavior: first retry is fast (100ms), next 9 retries 1s, after that we only reconnect every 10s.
     */
    private _computeReconnectIntervalInMilliseconds;
    private _shouldConnect;
    private subscribe;
    subscribeInvalidate(subscribe: SubscribeInvalidateDetails, callback: Callback): Subscription;
    subscribeDecoupledOperation(subscribe: Pick<SubscribeDecoupledOperation, "sessionId" | "decoupledOperationId">, callback: Callback): Subscription;
    private _startSubscription;
    private _fillInMessagesAfterConnectionInterruption;
    private _endSubscription;
    /**
     * Internal method for setting a related AuthorizedApiContext. This is used to retrieve
     * decoupled operation status on interrupted connections.
     */
    _setAuthorizedApiContext(ctx: AuthorizedApiContext): void;
    _startOrStopDisconnectTimeout(): void;
    private _sendWs;
    private _connect;
    /**
     * Error happend when trying to connect, but it may be solved by trying a reconnect later.
     */
    private _handleNonFatalError;
    /**
     * Fatal error: this means the client is unusable from now on and must be recreated.
     */
    private _handleFatalError;
    /**
     * If a fatal error occurs, all registered callbacks must be called with the error parameter.
     */
    private _notifySubscribersAboutFatalError;
    /**
     * Once we have successfully established a connection, error counts and states must be reset.
     */
    private _resetErrorState;
    private _findSubscriptionEntry;
}
export interface BrokerizeWebSocketClient {
    subscribeInvalidate: (subscribe: SubscribeInvalidateDetails, callback: Callback) => Subscription;
    subscribeDecoupledOperation: (subscribe: Pick<SubscribeDecoupledOperation, "sessionId" | "decoupledOperationId">, callback: Callback) => Subscription;
}
export type Callback<T = any> = (err: any, data: T) => void;
export type Subscription = {
    unsubscribe: () => void;
};
