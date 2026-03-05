import { Subject } from "rxjs";
import { createConfiguration } from "./apiCtx";
import { BrokerizeError } from "./errors";
import { createPollingSubscription } from "./pollingSubscription";
import * as openApiClient from "./swagger";
import { BrokerizeWebSocketClientImpl, } from "./websocketClient";
export class AuthorizedApiContext {
    constructor(cfg, auth, wsClient) {
        this._isDestroyed = false;
        this._cfg = cfg;
        this._auth = auth;
        this._childContexts = [];
        const apiConfig = createConfiguration(cfg);
        /* clone the config in order to have secondary API instances that send requests to
           the external crypto trading service. */
        const cfgCryptoService = {
            clientId: cfg.clientId,
            basePath: cfg.basePathCryptoService || cfg.basePath,
            createAbortController: cfg.createAbortController,
            createWebSocket: cfg.createWebSocket,
            fetch: cfg.fetch,
        };
        const apiConfigCryptoService = createConfiguration(cfgCryptoService);
        this._logoutSubject = new Subject();
        const postMiddleware = async (r) => {
            const statusCode = r.response.status;
            if (statusCode >= 400) {
                const decJson = (await r.response.json());
                const err = new BrokerizeError(statusCode, decJson);
                if (statusCode == 401) {
                    this._logoutSubject.error(err);
                }
                throw err;
            }
        };
        this._demoBrokerApi = new openApiClient.DemobrokerApi(apiConfig).withPostMiddleware(postMiddleware);
        this._tradeApi = new openApiClient.TradeApi(apiConfig).withPostMiddleware(postMiddleware);
        this._tradeApiCryptoService = new openApiClient.TradeApi(apiConfigCryptoService).withPostMiddleware(postMiddleware);
        this._metaApi = new openApiClient.MetaApi(apiConfig).withPostMiddleware(postMiddleware);
        this._sessionApi = new openApiClient.SessionApi(apiConfig).withPostMiddleware(postMiddleware);
        this._tradeDraftApi = new openApiClient.TradeDraftApi(apiConfig).withPostMiddleware(postMiddleware);
        this._orderApi = new openApiClient.OrderApi(apiConfig).withPostMiddleware(postMiddleware);
        this._orderApiCryptoService = new openApiClient.OrderApi(apiConfigCryptoService).withPostMiddleware(postMiddleware);
        this._exportApi = new openApiClient.ExportApi(apiConfig).withPostMiddleware(postMiddleware);
        this._adminApi = new openApiClient.AdminApi(apiConfig).withPostMiddleware(postMiddleware);
        this._securitiesApi = new openApiClient.SecuritiesApi(apiConfig).withPostMiddleware(postMiddleware);
        this._portfolioApi = new openApiClient.PortfolioApi(apiConfig).withPostMiddleware(postMiddleware);
        this._decoupledOperationsApi = new openApiClient.DecoupledOperationsApi(apiConfig).withPostMiddleware(postMiddleware);
        this._userApi = new openApiClient.UserApi(apiConfig).withPostMiddleware(postMiddleware);
        if (!cfg.createAbortController) {
            throw new Error("createAbortController not provided. This should not happen as there should be a default implementation.");
        }
        this._abortController = cfg.createAbortController();
        this._wsClient = wsClient || this._initInternalWebSocketClient();
        if (this._wsClient._setAuthorizedApiContext) {
            this._wsClient._setAuthorizedApiContext(this);
        }
        this._cache = {};
    }
    createChildContext() {
        const result = new AuthorizedApiContext(this._cfg, this._auth, this._wsClient);
        const childContexts = this._childContexts;
        childContexts.push(result);
        const origDestroy = result.destroy;
        result.destroy = () => {
            origDestroy.call(result);
            this._childContexts = this._childContexts.filter((ctx) => ctx != result);
        };
        return result;
    }
    async _initRequestInit() {
        if (this._isDestroyed) {
            throw new Error("AuthorizedApiContext is destroyed");
        }
        const tok = await this._auth.getToken();
        return {
            signal: this._abortController.signal,
            headers: {
                "x-brkrz-client-id": this._cfg.clientId,
                Authorization: "Bearer " + tok.idToken,
                "Content-Type": "application/json",
            },
        };
    }
    async getBrokers() {
        if (!this._cache.getBrokers) {
            this._cache.getBrokers = this._metaApi
                .getBrokers(await this._initRequestInit())
                .catch((err) => {
                delete this._cache.getBrokers;
                throw err;
            });
        }
        return this._cache.getBrokers;
    }
    async getTradeDrafts(params) {
        return this._tradeDraftApi.getTradeDrafts(params, await this._initRequestInit());
    }
    async createTradeDraft(params) {
        return this._tradeDraftApi.createTradeDrafts(params, await this._initRequestInit());
    }
    async updateTradeDraft(params) {
        return this._tradeDraftApi.updateTradeDraft(params, await this._initRequestInit());
    }
    async deactivateTradeDraft(params) {
        return this._tradeDraftApi.deactivateTradeDraft(params, await this._initRequestInit());
    }
    async deleteTradeDraft(params) {
        return this._tradeDraftApi.deleteTradeDraft(params, await this._initRequestInit());
    }
    async getLegalTerms() {
        return this._metaApi.getLegalTerms(await this._initRequestInit());
    }
    async getExchanges() {
        return this._metaApi.getExchanges(await this._initRequestInit());
    }
    async addSession(params) {
        return this._sessionApi.addSession({ addSessionParams: params }, await this._initRequestInit());
    }
    async getSessions() {
        return this._sessionApi.getSessions(await this._initRequestInit());
    }
    async createDemoAccount(demoAccountSettings) {
        return this._demoBrokerApi.createDemoAccount({
            demoAccountSettings,
        }, await this._initRequestInit());
    }
    async getAccessTokens() {
        return this._userApi.getAccessTokens(await this._initRequestInit());
    }
    async createAccessToken(params) {
        return this._userApi.createAccessToken({ createAccessTokenParams: params }, await this._initRequestInit());
    }
    async revokeAccessToken(accessTokenId) {
        return this._userApi.revokeAccessToken({
            accessTokenId,
        }, await this._initRequestInit());
    }
    async getAcessTokenAvailablePermissions() {
        return this._userApi.getAcessTokenAvailablePermissions(await this._initRequestInit());
    }
    async getDemoAccounts() {
        return this._demoBrokerApi.getDemoAccounts(await this._initRequestInit());
    }
    async deleteDemoAccount(del) {
        return this._demoBrokerApi.deleteDemoAccount(del, await this._initRequestInit());
    }
    async getOrder(orderId) {
        return this._orderApi.getOrder({ id: orderId }, await this._initRequestInit());
    }
    async createCancelOrderChallenge(req) {
        return this._orderApi.createCancelOrderChallenge(req, await this._initRequestInit());
    }
    async cancelOrder(req, viaCryptoService) {
        const api = viaCryptoService ? this._orderApiCryptoService : this._orderApi;
        return api.cancelOrder(req, await this._initRequestInit());
    }
    async createChangeOrderChallenge(req) {
        return this._orderApi.createChangeOrderChallenge(req, await this._initRequestInit());
    }
    async changeOrder(req, viaCryptoService) {
        const api = viaCryptoService ? this._orderApiCryptoService : this._orderApi;
        return api.changeOrder(req, await this._initRequestInit());
    }
    async getPortfolios() {
        return this._portfolioApi.getPortfolios(await this._initRequestInit());
    }
    async renamePortfolio(portfolioId, newPortfolioName) {
        return this._portfolioApi.renamePortfolio({ portfolioId, renamePortfolioRequest: { newPortfolioName } }, await this._initRequestInit());
    }
    async deletePortfolio(portfolioId) {
        return this._portfolioApi.deletePortfolio({ portfolioId }, await this._initRequestInit());
    }
    async getPortfolioQuotes(portfolioId) {
        return this._portfolioApi.getPortfolioQuotes({ portfolioId }, await this._initRequestInit());
    }
    async getPortfolioPositions(portfolioId) {
        return this._portfolioApi.getPortfolioPositions({ portfolioId }, await this._initRequestInit());
    }
    async getPortfolioOrders(req) {
        return this._portfolioApi.getPortfolioOrders(req, await this._initRequestInit());
    }
    async getPortfolioTrades(req) {
        return this._portfolioApi.getPortfolioTrades(req, await this._initRequestInit());
    }
    async getPortfolioCalendar(req) {
        return this._portfolioApi.getPortfolioCalendar(req, await this._initRequestInit());
    }
    async getPortfolioTradeWarnings(req) {
        return this._portfolioApi.getPortfolioTradeWarnings(req, await this._initRequestInit());
    }
    async getPortfolioTradeStatistics(req) {
        return this._portfolioApi.getPortfolioTradeStatistics(req, await this._initRequestInit());
    }
    async getAuthInfo(portfolioId) {
        return this._portfolioApi.getAuthInfo({ portfolioId }, await this._initRequestInit());
    }
    async addSessionCompleteChallenge(req) {
        return this._sessionApi.addSessionCompleteChallenge(req, await this._initRequestInit());
    }
    async createSessionTanChallenge(req) {
        return this._sessionApi.createSessionTanChallenge(req, await this._initRequestInit());
    }
    // XXX improve "kind" enum
    async enableSessionTan(req) {
        return this._sessionApi.enableSessionTan(req, await this._initRequestInit());
    }
    async endSessionTan(sessionId) {
        return this._sessionApi.endSessionTan({ sessionId }, await this._initRequestInit());
    }
    async getDecoupledOperationStatus(req) {
        return this._decoupledOperationsApi.getDecoupledOperationStatus(req, await this._initRequestInit());
    }
    async cancelDecoupledOperation(req) {
        return this._decoupledOperationsApi.cancelDecoupledOperation(req, await this._initRequestInit());
    }
    async triggerSessionSync(sessionId) {
        return this._sessionApi.triggerSessionSync({ sessionId }, await this._initRequestInit());
    }
    async triggerDemoSessionSyncError(sessionId) {
        return this._demoBrokerApi.triggerDemoSessionSyncError({ sessionId }, await this._initRequestInit());
    }
    async logoutSession(sessionId) {
        return this._sessionApi.logoutSession({ sessionId }, await this._initRequestInit());
    }
    async getUser() {
        return this._userApi.getUser(await this._initRequestInit());
    }
    async deleteGuestUser() {
        return this._userApi.deleteGuestUser(await this._initRequestInit());
    }
    async prepareTrade(req) {
        return this._tradeApi.prepareTrade(req, await this._initRequestInit());
    }
    async createTrade(req, viaCryptoService) {
        const api = viaCryptoService ? this._tradeApiCryptoService : this._tradeApi;
        return api.createTrade(req, await this._initRequestInit());
    }
    async createTradeChallenge(req) {
        return this._tradeApi.createTradeChallenge(req, await this._initRequestInit());
    }
    async getCostEstimation(p) {
        return this._tradeApi.getCostEstimation({
            getCostEstimationParams: p,
        }, await this._initRequestInit());
    }
    async getChangeOrderCostEstimation(orderId, changes) {
        return this._orderApi.getChangeOrderCostEstimation({
            estimateChangeOrderCostsParams: {
                changes,
            },
            id: orderId,
        }, await this._initRequestInit());
    }
    async getQuote(p) {
        return this._tradeApi.getQuote(p, await this._initRequestInit());
    }
    async prepareOAuthRedirect(p) {
        return this._sessionApi.prepareOAuthRedirect({ prepareOAuthRedirectParams: p }, await this._initRequestInit());
    }
    async confirmOAuth(p) {
        return this._sessionApi.confirmOAuth({ confirmOAuthParams: p }, await this._initRequestInit());
    }
    async getSecurityDetailedInfo(token) {
        return this._tradeApi.getSecurityDetailedInfo({
            token,
        }, await this._initRequestInit());
    }
    async renderGenericTablePdf(table) {
        const response = await this._exportApi.renderGenericTableRaw({
            renderGenericTableParams: {
                table,
            },
        }, await this._initRequestInit());
        return response.raw.blob();
    }
    async getMyClients() {
        return this._adminApi.getMyClients(await this._initRequestInit());
    }
    async createClient() {
        return this._adminApi.createClient(await this._initRequestInit());
    }
    async deleteClient(clientId) {
        return this._adminApi.deleteClient({
            clientId,
        }, await this._initRequestInit());
    }
    async addClientOrigin(clientId, origin) {
        return this._adminApi.addOrigin({
            clientId,
            addOriginRequest: {
                origin,
            },
        }, await this._initRequestInit());
    }
    async removeClientOrigin(clientId, origin) {
        return this._adminApi.removeOrigin({
            clientId,
            addOriginRequest: {
                origin,
            },
        }, await this._initRequestInit());
    }
    async addClientOAuthReturnToUrl(clientId, url) {
        return this._adminApi.addOAuthReturnToUrl({
            clientId,
            addOAuthReturnToUrlRequest: {
                url,
            },
        }, await this._initRequestInit());
    }
    async removeClientOAuthReturnToUrl(clientId, url) {
        return this._adminApi.removeOAuthReturnToUrl({
            clientId,
            addOAuthReturnToUrlRequest: {
                url,
            },
        }, await this._initRequestInit());
    }
    async setClientConfig(clientId, config) {
        return this._adminApi.setClientConfig({
            clientId,
            setClientConfigRequest: {
                config,
            },
        }, await this._initRequestInit());
    }
    async getOrderReport(opts) {
        var _a;
        const response = await this._adminApi.getOrderReportRaw({
            from: opts.from,
            to: opts.to,
            clientIds: ((_a = opts.clientIds) === null || _a === void 0 ? void 0 : _a.length)
                ? opts.clientIds.join(",")
                : undefined,
            format: opts.format,
            onlyExecutedOrders: opts.onlyExecutedOrders,
        }, await this._initRequestInit());
        const filename = response.raw.headers.get("x-brkrz-filename");
        const contentType = response.raw.headers.get("content-type");
        return { filename, data: response.raw.blob(), contentType };
    }
    async getSecurityQuotes(opts) {
        return this._securitiesApi.getSecurityQuotes({
            securityQuotesToken: opts.securityQuotesToken,
        }, await this._initRequestInit());
    }
    async getSecurityQuotesMeta(securityQuotesToken) {
        return this._securitiesApi.getSecurityQuotesMeta({
            securityQuotesToken,
        }, await this._initRequestInit());
    }
    /**
     * Subscribe to security quotes. Note that this currently uses polling to load the quotes from the
     * API. This will be replaced with a websocket-based solution in the future, but we can keep this
     * interface upwards-compatible.
     *
     * If an error occurs during the polling, the callback will receive the error and the subscription
     * ends, which means the application should handle the error and possibly re-subscribe later.
     *
     * @param securityQuotesToken the `securityQuotesToken` to subscribe to
     * @param callback a callback that will be called with the quotes
     * @returns a subscription object with a function `unsubscribe` that can be used to stop polling
     */
    subscribeQuotes(securityQuotesToken, callback) {
        return createPollingSubscription(() => this.getSecurityQuotes({ securityQuotesToken }), 2500, callback);
    }
    /**
     * Subscribe to the available order intents based on a `PreparedTrade`. Note that this currently uses polling to load the quotes from the
     * API. This will be replaced with a websocket-based solution in the future, but we can keep this
     * interface upwards-compatible.
     *
     * If an error occurs during the polling, the callback will receive the error and the subscription
     * ends, which means the application should handle the error and possibly re-subscribe later.
     *
     * @param preparedTrade The `PreparedTrade` as retrived by `PrepareTrade`.
     * @param callback a callback that will be called with the available order intents
     *
     * @returns a subscription object with a function `unsubscribe` that can be used to stop polling
     */
    subscribeAvailableOrderIntents(preparedTrade, callback) {
        let emitFallback = true;
        if (preparedTrade.availableOrderIntents) {
            callback(null, preparedTrade.availableOrderIntents);
            emitFallback = false;
        }
        if (preparedTrade.availableOrderIntentsToken) {
            const token = preparedTrade.availableOrderIntentsToken;
            return createPollingSubscription(async () => {
                const resp = await this._tradeApi.getAvailableOrderIntents({ token }, await this._initRequestInit());
                return resp;
            }, 5000, callback);
        }
        if (emitFallback) {
            callback(null, {
                buy: ["open"],
                sell: ["close"],
            });
        }
        return {
            unsubscribe() { },
        };
    }
    _initInternalWebSocketClient() {
        const basePath = this._cfg.basePath || "https://api-preview.brokerize.com";
        const websocketPath = getWebSocketURLByBasePath(basePath);
        if (!this._cfg.createWebSocket) {
            throw new Error("createWebSocket not provided. This should not happen as there should be a default implementation.");
        }
        return new BrokerizeWebSocketClientImpl(websocketPath, this._auth, this._cfg.createWebSocket);
    }
    createWebSocketClient() {
        const wrappedClient = {
            subscribeDecoupledOperation: this._wsClient.subscribeDecoupledOperation.bind(this._wsClient),
            subscribeInvalidate: this._wsClient.subscribeInvalidate.bind(this._wsClient),
        };
        return wrappedClient;
    }
    destroy() {
        this._isDestroyed = true;
        this._abortController.abort();
    }
    subscribeLogout(callback) {
        const s = this._logoutSubject.subscribe({
            error(err) {
                callback(err, null);
            },
        });
        return {
            unsubscribe() {
                s.unsubscribe();
            },
        };
    }
}
export function getWebSocketURLByBasePath(basePath) {
    const SUFFIX = "/websocket";
    if (basePath.startsWith("https")) {
        return "wss://" + basePath.substring(8) + SUFFIX;
    }
    else if (basePath.startsWith("http")) {
        return "ws://" + basePath.substring(7) + SUFFIX;
    }
    else {
        // might be a relative path
        return basePath + SUFFIX;
    }
}
