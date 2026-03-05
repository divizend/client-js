import { Models, TokenRefreshCallback } from ".";
import { WhatWgFetch } from "./dependencyDefinitions/fetch";
import { WebSocket } from "./dependencyDefinitions/webSocket";
import { Configuration } from "./swagger";
export interface BrokerizeConfig {
    fetch?: WhatWgFetch;
    createAbortController?: () => AbortController;
    createWebSocket?: (url?: string, protocol?: string | string[]) => WebSocket;
    /**
     * Path to the API, e.g. https://api-preview.brokerize.com
     */
    basePath?: string;
    /**
     * Path to the crypto trading API (c.f. tradingViaCryptoService), e.g. https://crypto-service-api.com
     */
    basePathCryptoService?: string;
    clientId: string;
    /**
     * The AWS cognito configuration, if the application is supposed to be used with brokerize accounts.
     */
    cognito?: CognitoConfig;
}
export type AuthContextConfiguration = GuestAuthContextConfiguration | RegisteredUserAuthContextConfiguration;
export type RegisteredUserAuthContextConfiguration = {
    type: "registered";
    username: string;
    tokens: TokenSet;
};
export type TokenSet = {
    idToken: string;
    refreshToken: string;
    expiresAt: number;
};
export interface GuestAuthContextConfiguration {
    type: "guest";
    /**
     * @deprecated use tokens instead
     */
    idToken: string;
    tokens: {
        updatedAt: number;
        response: Models.CreateGuestUserResponse;
    };
}
export interface Auth {
    getToken: () => Promise<{
        idToken: string;
    }>;
}
export declare function createConfiguration(cfg: BrokerizeConfig): Configuration;
export declare function createAuth({ authCfg, cfg, options, tokenRefreshCallback, }: {
    authCfg: AuthContextConfiguration;
    cfg: BrokerizeConfig;
    options?: AuthorizedApiContextOptions;
    tokenRefreshCallback?: TokenRefreshCallback;
}): Auth;
export type CognitoConfig = {
    poolConfig: CognitoPoolConfig;
    cognitoFacade: CognitoFacade;
};
export type CognitoPoolConfig = {
    UserPoolId: string;
    ClientId: string;
    Endpoint?: string | null;
};
export type CognitoFacade = {
    createSession: (cognitoPoolConfig: CognitoPoolConfig, authCfg: RegisteredUserAuthContextConfiguration) => {
        getToken: () => Promise<{
            idToken: string;
        }>;
    };
};
export type AuthorizedApiContextOptions = {
    cognitoFacade?: CognitoFacade;
};
