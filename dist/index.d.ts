import { Auth, AuthContextConfiguration, BrokerizeConfig, CognitoConfig, CognitoFacade, CognitoPoolConfig, GuestAuthContextConfiguration, RegisteredUserAuthContextConfiguration, TokenSet } from "./apiCtx";
import { AuthorizedApiContext } from "./authorizedApiContext";
import { BrokerizeError } from "./errors";
import * as Models from "./modelExports";
import { BrokerizeWebSocketClient, Callback, Subscription } from "./websocketClient";
import * as WebSocketTypes from "./websocketTypes";
import * as Utils from "./utils";
export { BrokerizeConfig, AuthContextConfiguration, AuthorizedApiContext, BrokerizeWebSocketClient, Models, WebSocketTypes, Subscription, Callback, Utils, BrokerizeError, Auth, TokenSet, };
export { CognitoPoolConfig, RegisteredUserAuthContextConfiguration };
export { CognitoConfig, CognitoFacade };
export declare class Brokerize {
    private _cfg;
    private _userApi;
    constructor(cfg: BrokerizeConfig);
    refreshGuestUser(refreshToken: string): Promise<GuestAuthContextConfiguration>;
    createGuestUser(): Promise<AuthContextConfiguration>;
    /**
     * Create a context for making authorized API calls. This context will automatically take care of refreshing the access token
     * tokens if required. The `AuthorizedApiContext` then is used to make API calls on behalf of the active user.
     *
     * @param authCtxCfg the auth context data, e.g. a token set for a guest user
     * @param tokenRefreshCallback when a token refresh occurs, this callback is called and can store the stored tokens
     * @returns
     */
    createAuthorizedContext(authCtxCfg: AuthContextConfiguration, tokenRefreshCallback?: TokenRefreshCallback, customWebSocketClient?: BrokerizeWebSocketClient): AuthorizedApiContext;
    getCognitoConfig(): CognitoPoolConfig | undefined;
    /**
     * Create an "Auth" object which can be used to retrive access tokens.
     * Can be used by applications to manually make requests to the API without
     * using the provided `AuthorizedApiContext` methods.
     *
     * @param authCtxCfg the auth context configuration
     * @param tokenRefreshCallback when a token refresh occurs, this callback is called and can store the stored tokens
     * @returns
     */
    createAuth(authCtxCfg: AuthContextConfiguration, tokenRefreshCallback?: TokenRefreshCallback): Auth;
    /**
     * Create a customized WebSocket client. You can override the WebSocket connection URL and the Auth implementation
     * for a custom token retrieval behavior.
     *
     * Note that in most contexts this is not needed.
     *
     * If you want to use it, you should use the created client in your call to `createAuthorizedContext`, so that it
     * is used by clients:
     *
     * ```
     * const customWebSocketClient = Brokerize.createCustomWebSocketClient({ auth: { async getToken() {...} }});
     * const authorizedApiCtx = Brokerize.createAuthorizedContext(authCtxCfg, tokenRefreshCallback, customWebSocketClient);
     * ```
     */
    createCustomWebSocketClient({ url, auth, }: {
        url?: string;
        auth: Auth;
    }): BrokerizeWebSocketClient;
}
/**
 * When a token update occurs (e.g. due to a refreshToken call), this callback is called.
 * Clients can save the new tokens to their persistent token storage.
 */
export type TokenRefreshCallback = (cfg: AuthContextConfiguration) => void;
