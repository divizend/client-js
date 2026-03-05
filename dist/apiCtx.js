/* Import/Export the DOM parts we rely on. Those are partial copies from the official TypeScript DOM library definitions (https://github.com/microsoft/TypeScript/blob/master/lib/lib.dom.d.ts),
   but reduced to the parts actually used by bg-trading. */
import { BrokerizeError } from ".";
import { Configuration } from "./swagger";
export function createConfiguration(cfg) {
    if (!cfg.clientId) {
        throw new Error("You must configure a clientId to use the brokerize API.");
    }
    return new Configuration({
        fetchApi: cfg.fetch,
        basePath: cfg.basePath,
    });
}
export function createAuth({ authCfg, cfg, options, tokenRefreshCallback, }) {
    var _a;
    if (authCfg.type == "guest") {
        const guestAuthCfg = JSON.parse(JSON.stringify(authCfg)); // clone it
        return {
            async getToken() {
                if (guestAuthCfg.tokens) {
                    let expiresIn = guestAuthCfg.tokens.response.expiresIn;
                    if (expiresIn == null) {
                        // eslint-disable-next-line no-console
                        console.log("[brokerize client] expiresIn is unexpectedly nullish. assuming 300 seconds");
                        expiresIn = 300;
                    }
                    /* modern tokens */
                    const tokenExpiresAt = guestAuthCfg.tokens.updatedAt + expiresIn * 1000 - 10000;
                    const needsRefresh = Date.now() > tokenExpiresAt;
                    if (needsRefresh && guestAuthCfg.tokens.response.refreshToken) {
                        if (!cfg.fetch) {
                            throw new Error("Invalid cfg: fetch is required for refreshing tokens.");
                        }
                        const response = await fetch(cfg.basePath + "/user/token", {
                            method: "POST",
                            headers: {
                                "x-brkrz-client-id": cfg.clientId,
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            // XXX some runtimes do not have URLSearchParams, so just produce the body in the old-fashioned way
                            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(guestAuthCfg.tokens.response.refreshToken)}`,
                        });
                        if (!response.ok) {
                            throw new BrokerizeError(401, {
                                msg: "The token could not be refreshed. Please log in again.",
                                code: "AUTH",
                            });
                        }
                        const responseJson = (await response.json());
                        guestAuthCfg.idToken = responseJson.access_token;
                        // replace the original object
                        guestAuthCfg.tokens = {
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
                        };
                        if (tokenRefreshCallback) {
                            tokenRefreshCallback(guestAuthCfg);
                        }
                        return { idToken: responseJson.access_token };
                    }
                }
                return { idToken: guestAuthCfg.idToken };
            },
        };
    }
    else if (authCfg.type == "registered") {
        if (!cfg.cognito) {
            throw new Error("Trying to initialize createAuth for cognito, but no cognito config present in BrokerizeConfig.");
        }
        if (!(options === null || options === void 0 ? void 0 : options.cognitoFacade)) {
            throw new Error("Trying to initialize createAuth for cognito, but access to the cognito library was not provided in the options.");
        }
        const session = options.cognitoFacade.createSession((_a = cfg.cognito) === null || _a === void 0 ? void 0 : _a.poolConfig, authCfg);
        return {
            async getToken() {
                return session.getToken();
            },
        };
    }
    else {
        throw new Error("Unsupported auth config.");
    }
}
