"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brokerize = exports.BrokerizeError = exports.Utils = exports.WebSocketTypes = exports.Models = exports.AuthorizedApiContext = void 0;
/* Import/Export the DOM parts we rely on. Those are partial copies from the official TypeScript DOM library definitions (https://github.com/microsoft/TypeScript/blob/master/lib/lib.dom.d.ts),
   but reduced to the parts actually used by bg-trading. */
const apiCtx_1 = require("./apiCtx");
const authorizedApiContext_1 = require("./authorizedApiContext");
Object.defineProperty(exports, "AuthorizedApiContext", { enumerable: true, get: function () { return authorizedApiContext_1.AuthorizedApiContext; } });
const errors_1 = require("./errors");
Object.defineProperty(exports, "BrokerizeError", { enumerable: true, get: function () { return errors_1.BrokerizeError; } });
const openApiClient = __importStar(require("./swagger"));
const Models = __importStar(require("./modelExports"));
exports.Models = Models;
const websocketClient_1 = require("./websocketClient");
const WebSocketTypes = __importStar(require("./websocketTypes"));
exports.WebSocketTypes = WebSocketTypes;
const Utils = __importStar(require("./utils"));
exports.Utils = Utils;
class Brokerize {
    constructor(cfg) {
        if (!cfg.fetch) {
            const global = getGlobalObject();
            if (!global.fetch) {
                throw new Error("fetch is not provided and no global fetch function is available");
            }
            cfg.fetch = global.fetch.bind(global);
        }
        if (!cfg.createAbortController) {
            const global = getGlobalObject();
            if (!global.AbortController) {
                throw new Error("createAbortController not provided and no global AbortController is available");
            }
            cfg.createAbortController = () => {
                return new global.AbortController();
            };
        }
        if (!cfg.createWebSocket) {
            const global = getGlobalObject();
            if (!global.WebSocket) {
                throw new Error("WebSocket implementation not available. Please provide one in BrokerizeConfig.");
            }
            cfg.createWebSocket = (url, protocol) => new global.WebSocket(url, protocol);
        }
        this._cfg = cfg;
        this._userApi = new openApiClient.UserApi((0, apiCtx_1.createConfiguration)(cfg));
    }
    async refreshGuestUser(refreshToken) {
        const response = await fetch(this._cfg.basePath + "/user/token", {
            method: "POST",
            headers: {
                "x-brkrz-client-id": this._cfg.clientId,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            // XXX some runtimes do not have URLSearchParams, so just produce the body in the old-fashioned way
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
        });
        if (!response.ok) {
            throw new errors_1.BrokerizeError(401, {
                msg: "The token could not be refreshed. Please log in again.",
                code: "AUTH",
            });
        }
        const responseJson = (await response.json());
        return {
            type: "guest",
            idToken: responseJson.access_token,
            tokens: {
                updatedAt: Date.now(),
                response: {
                    accessToken: responseJson.access_token,
                    refreshToken: responseJson.refresh_token,
                    expiresIn: responseJson.expires_in,
                    tokenType: responseJson.token_type,
                    refreshTokenExpiresIn: responseJson.refresh_token_expires_in,
                    idToken: responseJson.access_token,
                    refreshTokenWithoutTradingsession: responseJson.refresh_token_without_tradingsession,
                    refreshTokenWithoutTradingsessionExpiresIn: responseJson.refresh_token_without_tradingsession_expires_in,
                },
            },
        };
    }
    async createGuestUser() {
        const updatedAt = Date.now();
        const user = await this._userApi.createGuestUser({
            headers: {
                "x-brkrz-client-id": this._cfg.clientId,
                "Content-Type": "application/json",
            },
        });
        return {
            type: "guest",
            idToken: user.idToken,
            tokens: {
                updatedAt,
                response: user,
            },
        };
    }
    /**
     * Create a context for making authorized API calls. This context will automatically take care of refreshing the access token
     * tokens if required. The `AuthorizedApiContext` then is used to make API calls on behalf of the active user.
     *
     * @param authCtxCfg the auth context data, e.g. a token set for a guest user
     * @param tokenRefreshCallback when a token refresh occurs, this callback is called and can store the stored tokens
     * @returns
     */
    createAuthorizedContext(authCtxCfg, tokenRefreshCallback, customWebSocketClient) {
        const auth = this.createAuth(authCtxCfg, tokenRefreshCallback);
        return new authorizedApiContext_1.AuthorizedApiContext(this._cfg, auth, customWebSocketClient);
    }
    getCognitoConfig() {
        var _a;
        return (_a = this._cfg.cognito) === null || _a === void 0 ? void 0 : _a.poolConfig;
    }
    /**
     * Create an "Auth" object which can be used to retrive access tokens.
     * Can be used by applications to manually make requests to the API without
     * using the provided `AuthorizedApiContext` methods.
     *
     * @param authCtxCfg the auth context configuration
     * @param tokenRefreshCallback when a token refresh occurs, this callback is called and can store the stored tokens
     * @returns
     */
    createAuth(authCtxCfg, tokenRefreshCallback) {
        var _a;
        return (0, apiCtx_1.createAuth)({
            authCfg: authCtxCfg,
            cfg: this._cfg,
            tokenRefreshCallback,
            options: {
                cognitoFacade: (_a = this._cfg.cognito) === null || _a === void 0 ? void 0 : _a.cognitoFacade,
            },
        });
    }
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
    createCustomWebSocketClient({ url, auth, }) {
        if (!(url === null || url === void 0 ? void 0 : url.length)) {
            const basePath = this._cfg.basePath || "https://api-preview.brokerize.com";
            url = (0, authorizedApiContext_1.getWebSocketURLByBasePath)(basePath);
        }
        if (this._cfg.createWebSocket == null) {
            throw new Error("createWebSocket must be configured");
        }
        if (!(auth === null || auth === void 0 ? void 0 : auth.getToken)) {
            throw new Error("Auth implementation with getToken function must be provided");
        }
        return new websocketClient_1.BrokerizeWebSocketClientImpl(url, auth, this._cfg.createWebSocket);
    }
}
exports.Brokerize = Brokerize;
function getGlobalObject() {
    if (typeof globalThis !== "undefined")
        return globalThis;
    if (typeof self !== "undefined")
        return self;
    if (typeof window !== "undefined")
        return window;
    if (typeof global !== "undefined")
        return global;
    throw new Error("Unable to determine global object");
}
