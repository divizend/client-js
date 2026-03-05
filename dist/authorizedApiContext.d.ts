import { Auth, BrokerizeConfig } from "./apiCtx";
import * as openApiClient from "./swagger";
import { AddSessionParams, ConfirmOAuthParams, CreateTradeChallengeRequest, CreateTradeRequest, DeleteDemoAccountRequest, DemoAccountSettings, GenericTable, GetCostEstimationParams, GetQuoteRequest, OrderChanges, PrepareOAuthRedirectParams, PrepareTradeRequest } from "./swagger";
import { BrokerizeWebSocketClient, Callback, Subscription } from "./websocketClient";
export declare class AuthorizedApiContext {
    private _isDestroyed;
    private _childContexts;
    private readonly _cfg;
    private readonly _auth;
    private readonly _demoBrokerApi;
    private readonly _tradeApi;
    private readonly _tradeApiCryptoService;
    private readonly _abortController;
    private readonly _metaApi;
    private readonly _sessionApi;
    private readonly _tradeDraftApi;
    private readonly _orderApi;
    private readonly _orderApiCryptoService;
    private readonly _logoutSubject;
    private readonly _wsClient;
    private readonly _cache;
    private readonly _exportApi;
    private readonly _adminApi;
    private readonly _userApi;
    private readonly _securitiesApi;
    private readonly _portfolioApi;
    private readonly _decoupledOperationsApi;
    constructor(cfg: BrokerizeConfig, auth: Auth, wsClient?: BrokerizeWebSocketClient);
    createChildContext(): AuthorizedApiContext;
    private _initRequestInit;
    getBrokers(): Promise<openApiClient.GetBrokersResponse>;
    getTradeDrafts(params: openApiClient.GetTradeDraftsRequest): Promise<openApiClient.GetActiveTradeDraftsResponse>;
    createTradeDraft(params: openApiClient.CreateTradeDraftsRequest): Promise<openApiClient.CreateTradeDrafts200Response>;
    updateTradeDraft(params: openApiClient.UpdateTradeDraftRequest): Promise<void>;
    deactivateTradeDraft(params: openApiClient.DeactivateTradeDraftRequest): Promise<void>;
    deleteTradeDraft(params: openApiClient.DeleteTradeDraftRequest): Promise<void>;
    getLegalTerms(): Promise<openApiClient.LegalTermsResponse>;
    getExchanges(): Promise<openApiClient.ExchangesResponse>;
    addSession(params: AddSessionParams): Promise<openApiClient.LoginResponse>;
    getSessions(): Promise<openApiClient.SessionResponse>;
    createDemoAccount(demoAccountSettings?: DemoAccountSettings): Promise<openApiClient.CreatedResponseBody>;
    getAccessTokens(): Promise<openApiClient.GetAccessTokensResponse>;
    createAccessToken(params: openApiClient.CreateAccessTokenParams): Promise<openApiClient.AccessTokenResult>;
    revokeAccessToken(accessTokenId: string): Promise<void>;
    getAcessTokenAvailablePermissions(): Promise<openApiClient.GetAcessTokenAvailablePermissions200Response>;
    getDemoAccounts(): Promise<openApiClient.DemoAccountsResponse>;
    deleteDemoAccount(del: DeleteDemoAccountRequest): Promise<openApiClient.OkResponseBody>;
    getOrder(orderId: string): Promise<openApiClient.GetOrderResponse>;
    createCancelOrderChallenge(req: openApiClient.CreateCancelOrderChallengeRequest): Promise<openApiClient.Challenge>;
    cancelOrder(req: openApiClient.CancelOrderRequest, viaCryptoService?: boolean): Promise<openApiClient.CancelOrderResponse>;
    createChangeOrderChallenge(req: openApiClient.CreateChangeOrderChallengeRequest): Promise<openApiClient.Challenge>;
    changeOrder(req: openApiClient.ChangeOrderRequest, viaCryptoService?: boolean): Promise<openApiClient.ChangeOrderResponse>;
    getPortfolios(): Promise<openApiClient.PortfoliosResponse>;
    renamePortfolio(portfolioId: string, newPortfolioName: string): Promise<void>;
    deletePortfolio(portfolioId: string): Promise<openApiClient.OkResponseBody>;
    getPortfolioQuotes(portfolioId: string): Promise<openApiClient.GetPortfolioQuotesResponse>;
    getPortfolioPositions(portfolioId: string): Promise<openApiClient.GetPortfolioPositionsResponse>;
    getPortfolioOrders(req: openApiClient.GetPortfolioOrdersRequest): Promise<openApiClient.GetPortfolioOrdersResponse>;
    getPortfolioTrades(req: openApiClient.GetPortfolioTradesRequest): Promise<openApiClient.GetPortfolioTradesResponse>;
    getPortfolioCalendar(req: openApiClient.GetPortfolioCalendarRequest): Promise<openApiClient.GetPortfolioCalendarResponse>;
    getPortfolioTradeWarnings(req: openApiClient.GetPortfolioTradeWarningsRequest): Promise<openApiClient.TradeWarning[]>;
    getPortfolioTradeStatistics(req: openApiClient.GetPortfolioTradeStatisticsRequest): Promise<openApiClient.GetPortfolioTradeStatisticsResponse>;
    getAuthInfo(portfolioId: string): Promise<openApiClient.GetAuthInfoResponse>;
    addSessionCompleteChallenge(req: openApiClient.AddSessionCompleteChallengeRequest): Promise<openApiClient.LoginResponseReady>;
    createSessionTanChallenge(req: openApiClient.CreateSessionTanChallengeRequest): Promise<openApiClient.Challenge>;
    enableSessionTan(req: openApiClient.EnableSessionTanRequest): Promise<openApiClient.EnableSessionTanResponse>;
    endSessionTan(sessionId: string): Promise<openApiClient.EndSessionTanResponse>;
    getDecoupledOperationStatus(req: openApiClient.GetDecoupledOperationStatusRequest): Promise<openApiClient.DecoupledOperationStatus>;
    cancelDecoupledOperation(req: openApiClient.CancelDecoupledOperationRequest): Promise<void>;
    triggerSessionSync(sessionId: string): Promise<openApiClient.OkResponseBody>;
    triggerDemoSessionSyncError(sessionId: string): Promise<openApiClient.OkResponseBody>;
    logoutSession(sessionId: string): Promise<openApiClient.LogoutOkResponseBody>;
    getUser(): Promise<openApiClient.GetUserResponse>;
    deleteGuestUser(): Promise<void>;
    prepareTrade(req: PrepareTradeRequest): Promise<openApiClient.PrepareTradeResponse>;
    createTrade(req: CreateTradeRequest, viaCryptoService?: boolean): Promise<openApiClient.CreateTradeResponse>;
    createTradeChallenge(req: CreateTradeChallengeRequest): Promise<openApiClient.Challenge>;
    getCostEstimation(p: GetCostEstimationParams): Promise<openApiClient.OrderCostEstimation>;
    getChangeOrderCostEstimation(orderId: string, changes: OrderChanges): Promise<openApiClient.OrderCostEstimation>;
    getQuote(p: GetQuoteRequest): Promise<openApiClient.GetQuoteResponse>;
    prepareOAuthRedirect(p: PrepareOAuthRedirectParams): Promise<openApiClient.PrepareOAuthRedirectResponse>;
    confirmOAuth(p: ConfirmOAuthParams): Promise<openApiClient.ConfirmOAuthResponse>;
    getSecurityDetailedInfo(token: string): Promise<openApiClient.GenericTable>;
    renderGenericTablePdf(table: GenericTable): Promise<Blob>;
    getMyClients(): Promise<openApiClient.ClientsResponseInner[]>;
    createClient(): Promise<openApiClient.CreateClient200Response>;
    deleteClient(clientId: string): Promise<void>;
    addClientOrigin(clientId: string, origin: string): Promise<void>;
    removeClientOrigin(clientId: string, origin: string): Promise<void>;
    addClientOAuthReturnToUrl(clientId: string, url: string): Promise<void>;
    removeClientOAuthReturnToUrl(clientId: string, url: string): Promise<void>;
    setClientConfig(clientId: string, config: openApiClient.ClientConfigUpdate): Promise<void>;
    getOrderReport(opts: {
        from: string;
        to: string;
        clientIds?: string[];
        onlyExecutedOrders?: boolean;
        format?: "xlsx" | "csv";
    }): Promise<{
        filename: string | null;
        data: Promise<Blob>;
        contentType: string | null;
    }>;
    getSecurityQuotes(opts: {
        securityQuotesToken: string;
    }): Promise<openApiClient.SecurityQuotesResponse>;
    getSecurityQuotesMeta(securityQuotesToken: string): Promise<openApiClient.SecurityQuotesMeta>;
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
    subscribeQuotes(securityQuotesToken: string, callback: Callback<openApiClient.SecurityQuotesResponse | undefined>): {
        unsubscribe(): void;
    };
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
    subscribeAvailableOrderIntents(preparedTrade: openApiClient.PreparedTrade, callback: Callback<openApiClient.OrderIntentAvailability | undefined>): {
        unsubscribe(): void;
    };
    private _initInternalWebSocketClient;
    createWebSocketClient(): BrokerizeWebSocketClient;
    destroy(): void;
    subscribeLogout(callback: Callback): Subscription;
}
export declare function getWebSocketURLByBasePath(basePath: string): string;
