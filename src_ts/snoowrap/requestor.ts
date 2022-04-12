import { isBrowser } from "../utility/polyfills";
import logger from "./logger";
import axios from './axios'
import { RateLimitError, rateLimitWarning, RequestError } from "../utility/errors";
import { IDEMPOTENT_HTTP_VERBS, MAX_TOKEN_LATENCY } from "../utility/constants";
import { includes, merge } from "lodash";
import snoowrap from "./snoowrap";

export interface snoowrap_options{
    userAgent?: string,
    clientId?: string,
    clientSecret?: string,
    username?: string,
    password?: string,
    refreshToken?: string,
    accessToken?: string,
}

export interface getAuthUrlOptions {
    clientId: string,
    scope: string[],
    redirectUri: string,
    permanent: boolean,
    state: string,
    endpointDomain: string,
    compact: boolean;
}

export interface fromAuthCodeOptions{
    code: string,
    userAgent: string,
    clientId: string,
    clientSecret?: string,
    redirectUri: string,
    endpointDomain: string
}

export interface BaseAuthOptions {
    clientId: string;
    endpointDomain?: string;
}

export interface AuthUrlOptions extends BaseAuthOptions {
    scope: string[];
    redirectUri: string;
    permanent?: boolean; // defaults to true
    state?: string;
}

export interface AuthCodeOptions extends BaseAuthOptions {
    code: string;
    userAgent: string;
    clientSecret?: string;
    redirectUri: string;
    permanent?: boolean; // defaults to true
    endpointDomain?: string;
    deviceId?: string;
}

export type GrantType = 'client_credentials' | 'https://oauth.reddit.com/grants/installed_client'

interface BaseAuthOnlyOptions extends BaseAuthOptions{
  userAgent: string,
  permanent?: boolean
}

interface AuthOnlyCredentialsOptions extends BaseAuthOnlyOptions {
  clientSecret: string
  grantType: 'client_credentials',
  deviceId?: string
}

interface AuthOnlyInstalledOptions extends BaseAuthOnlyOptions {
  clientSecret?: string
  grantType?: 'https://oauth.reddit.com/grants/installed_client'
  deviceId: string
}


export type AuthOnlyOptions = AuthOnlyCredentialsOptions | AuthOnlyInstalledOptions

export class requestor extends logger implements snoowrap_options{

    constructor(options: snoowrap_options){
        super()

        this.userAgent = options.userAgent;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.username = options.username;
        this.password = options.password;
        this.refreshToken = options.refreshToken;
        this.accessToken = options.accessToken;

        // @ts-expect-error
        if (isBrowser) { this.userAgent = global.navigator.userAgent; }
    }

    public userAgent?: string;
    public clientId?: string;
    public clientSecret?: string;
    public username?: string;
    public password?: string;
    public refreshToken?: string;
    public accessToken?: string;

    public scope: string[] = [];

    protected rateLimitRemaining: number = 0;
    protected rateLimitExpiration: number = 0;
    protected nextRequestTimestamp: number = -Infinity;
    protected tokenExpiration?: number = undefined;

    public async oauthRequest(options, attempts: number = 1){
        try{
            await this.#awaitRateLimit();
            await this.#awaitRequestDelay();
            await this.#awaitExponentialBackoff(attempts);
            
            const token = await this.updateAccessToken();
            const response = await this.rawRequest(
                merge({
                    baseURL: `https://oauth.${this._config.endpointDomain}`,
                    headers: {
                      authorization: `Bearer ${token}`,
                      'user-agent': this.userAgent
                    },
                    params: {
                      raw_json: 1
                    },
                    timeout: this._config.requestTimeout,
                    _r: this
                }, options)
            );

            // Update rate limit expiration stuff
            if (response.headers['x-ratelimit-remaining']){
                this.rateLimitRemaining = +response.headers['x-ratelimit-remaining'];
                this.rateLimitExpiration = Date.now() + (response.headers['x-ratelimit-reset'] * 1000);
            }

            // Output debug messages as needed
            this.debug(
                `Received a ${response.status} status code from a \`${response.config.method}\` request`,
                `sent to ${response.config.url}. ratelimitRemaining: ${this.rateLimitRemaining}`
            )

            const populated = this._populate(response.data);
            if (populated && populated.constructor._name === 'Listing') {
                populated._setUri(response.config.url);
            }
            return populated;

        } catch ( e: any ){
            this.debug('Error:', {e});

            if (e.response && this._config.retryErrorCodes.some(retryCode => retryCode === e.response.status)) {
                if (!includes(IDEMPOTENT_HTTP_VERBS, e.config.method) || attempts >= this._config.maxRetryAttempts) {
                    throw e;
                }
                /* If the error's status code is in the user's configured `retryStatusCodes` and this request still has attempts
                remaining, retry this request and increment the `attempts` counter. */
                this.warn(
                    `Received status code ${e.response.status} from reddit.`,
                    `Retrying request (attempt ${attempts + 1}/${this._config.maxRetryAttempts})...`
                );
                return this.oauthRequest(options, attempts + 1);
            } else if (e.response && e.response.status === 401) {

                /* If the server returns a 401 error, it's possible that the access token expired during the latency period as this
                request was being sent. In this scenario, snoowrap thought that the access token was valid for a few more seconds, so it
                didn't refresh the token, but the token had expired by the time the request reached the server. To handle this issue,
                invalidate the access token and call oauth_request again, automatically causing the token to be refreshed. */
                if (this.accessToken && (this.tokenExpiration?? 0) - Date.now() < MAX_TOKEN_LATENCY) {
                    this.accessToken = undefined;
                    this.tokenExpiration = undefined;
                    return this.oauthRequest(options, attempts);
                }
                throw e;
            } else {
                throw e;
            }

        }
    }

    async #awaitRateLimit(){
        if ( this.rateLimitRemaining < 1 && Date.now() < this.rateLimitExpiration){
            // If the ratelimit has been exceeded, delay or abort the request depending on the user's config.
            const timeUntilExpiry = this.rateLimitExpiration - Date.now();

            if( this._config.continueAfterRatelimitError ){
                /* If the `continue_after_ratelimit_error` setting is enabled, queue the request, wait until the next ratelimit
                period, and then send it. */
                this.warn(rateLimitWarning(timeUntilExpiry));
                return new Promise(resolve => setTimeout(resolve, timeUntilExpiry));
            }

            // Otherwise, throw an error.
            throw new RateLimitError();
        }

        // If the ratelimit hasn't been exceeded, no delay is necessary.
    }

    async #awaitRequestDelay(){
        const now = Date.now();
        const waitTime = this.nextRequestTimestamp - now;
        this.nextRequestTimestamp = Math.max(now, this.nextRequestTimestamp) + this._config.requestDelay;
        return new Promise(resolve => setTimeout(resolve, waitTime));
    }

    async #awaitExponentialBackoff( attempts: number ){
        if (attempts === 1) { return; }
        const waitTime = (Math.pow(2, attempts - 1) + (Math.random() - 0.3)) * 1000;
        return new Promise(resolve => setTimeout(resolve, waitTime));
    }

    public credentialedClientRequest(options){
        return this.rawRequest(
            merge({
                baseURL: this._config ? `https://www.${this._config.endpointDomain}` : undefined,
                headers: {
                  'user-agent': this.userAgent
                },
                auth: {
                  username: this.clientId ?? '',
                  password: this.clientSecret ?? ''
                },
                _r: this
              }, options)
        )
    }

    public unauthenticatedRequest(options){
        return this.rawRequest(
            merge({
                baseURL: `https://www.${this._config.endpointDomain}`,
                headers: {
                  'user-agent': this.userAgent
                },
                _r: this
              }, options)
        )
    }

    public async updateAccessToken(){
        // If the current access token is missing or expired, and it is possible to get a new one, do so.
        if ((!this.accessToken || Date.now() > (this.tokenExpiration?? 0)) && (this.refreshToken || (this.username && this.password))) {
            
            const response = await this.credentialedClientRequest({
                method: 'post',
                url: 'api/v1/access_token',
                form: this.refreshToken
                    ? {grant_type: 'refresh_token', refresh_token: this.refreshToken}
                    : {grant_type: 'password', username: this.username, password: this.password}
            });

            const tokenInfo = response.data;

            if (tokenInfo.error === 'invalid_grant') {
                throw new Error('"Invalid grant" error returned from reddit. (You might have incorrect credentials.)');
            } else if (tokenInfo.error_description !== undefined) {
                throw new Error(`Reddit returned an error: ${tokenInfo.error}: ${tokenInfo.error_description}`);
            } else if (tokenInfo.error !== undefined) {
                throw new Error(`Reddit returned an error: ${tokenInfo.error}`);
            }

            this.accessToken = tokenInfo.access_token;
            this.tokenExpiration = Date.now() + (tokenInfo.expires_in * 1000);
            this.scope = tokenInfo.scope.split(' ');

            return this.accessToken;

        }

        // Otherwise, just return the existing token.
        return this.accessToken;
    }

    public rawRequest = axios

    static getAuthUrl( {
        clientId, scope = ["*"], redirectUri, permanent = true, state = '_',
        endpointDomain = 'reddit.com', compact = false
    }: getAuthUrlOptions) : string{
        if ( scope.length < 1 ){
            throw new TypeError('Missing `scope` argument; a non-empty list of OAuth scopes must be provided');
        }

        return `
            https://www.${endpointDomain}/api/v1/authorize
            ${compact ? '.compact' : ''}
            ?client_id=${encodeURIComponent(clientId)}
            &response_type=code
            &state=${encodeURIComponent(state)}
            &redirect_uri=${encodeURIComponent(redirectUri)}
            &duration=${permanent ? 'permanent' : 'temporary'}
            &scope=${encodeURIComponent(scope.join(' '))}
        `.replace(/\s/g, '');
    }

    static async fromAuthCode( {
        code, 
        // @ts-expect-error
        userAgent = isBrowser ? global.navigator.userAgent : undefined,
        clientId, clientSecret, redirectUri, endpointDomain
    }: fromAuthCodeOptions) : Promise<snoowrap>{

        const proto = new this({userAgent, clientId, clientSecret});
        const response = await proto.credentialedClientRequest({
            method: 'post',
            baseURL: `https://www.${endpointDomain}/`,
            url: 'api/v1/access_token',
            form: {grant_type: 'authorization_code', code, redirect_uri: redirectUri}
        })

        const instance = new snoowrap({
            userAgent, clientId, clientSecret,
            ...response.data
        })
        instance.tokenExpiration = Date.now() + (response.data.expires_in * 1000);
        instance.scope = response.data.scope.split(' ');
        instance.config({endpointDomain});
        return instance;
    }

    static async fromApplicationOnlyAuth({
        // @ts-expect-error
        userAgent = isBrowser ? global.navigator.userAgent : undefined,
        clientId, clientSecret, deviceId, grantType = requestor.grantType.INSTALLED_CLIENT,
        permanent = true, endpointDomain = 'reddit.com'
    } : AuthOnlyOptions){
        const proto = new this({userAgent, clientId, clientSecret});
        const response = await proto.credentialedClientRequest({
            method: 'post',
            baseURL: `https://www.${endpointDomain}/`,
            url: 'api/v1/access_token',
            form: {grant_type: grantType, device_id: deviceId, duration: permanent ? 'permanent' : 'temporary'}
        })

        if (response.data.error) {
            throw new RequestError(`API Error: ${response.data.error} - ${response.data.error_description}`);
        }

        const instance = new snoowrap({
            userAgent, clientId, clientSecret,
            ...response.data
        })
        instance.tokenExpiration = Date.now() + (response.data.expires_in * 1000);
        instance.scope = response.data.scope.split(' ');
        instance.config({endpointDomain});
        return instance;
    }

    _populate(data: any) : any {
        throw new Error("Function not implemented.");
    }

    /**
     * Define method shortcuts for each of the HTTP verbs. i.e. `snoowrap.prototype._post` is the same as `oauth_request` except
     * that the HTTP method defaults to `post`, and the result is promise-wrapped. Use Object.defineProperty to ensure that the
     * properties are non-enumerable.
     */

    public _get( options: any ){ return this.oauthRequest({...options, method: 'get'})}
    public _delete( options: any ){ return this.oauthRequest({...options, method: 'delete'})}
    public _head( options: any ){ return this.oauthRequest({...options, method: 'head'})}
    public _patch( options: any ){ return this.oauthRequest({...options, method: 'patch'})}
    public _post( options: any ){ return this.oauthRequest({...options, method: 'post'})}
    public _put( options: any ){ return this.oauthRequest({...options, method: 'put'})}


    _revokeToken (token: string) {
        return this.credentialedClientRequest({url: 'api/v1/revoke_token', form: {token}, method: 'post'});
    }
    
      /**
       * @summary Invalidates the current access token.
       * @returns {Promise} A Promise that fulfills when this request is complete
       * @desc **Note**: This can only be used if the current requester was supplied with a `client_id` and `client_secret`. If the
       * current requester was supplied with a refresh token, it will automatically create a new access token if any more requests
       * are made after this one.
       * @example r.revokeAccessToken();
       */
    public async revokeAccessToken () {
        await this._revokeToken(this.accessToken ?? '');
        this.accessToken = undefined;
        this.tokenExpiration = undefined;
        this.scope = [];
    }
    
      /**
       * @summary Invalidates the current refresh token.
       * @returns {Promise} A Promise that fulfills when this request is complete
       * @desc **Note**: This can only be used if the current requester was supplied with a `client_id` and `client_secret`. All
       * access tokens generated by this refresh token will also be invalidated. This effectively de-authenticates the requester and
       * prevents it from making any more valid requests. This should only be used in a few cases, e.g. if this token has
       * been accidentally leaked to a third party.
       * @example r.revokeRefreshToken();
       */
    public async revokeRefreshToken () {
        await this._revokeToken(this.refreshToken?? '');
        this.refreshToken = undefined;
        this.accessToken = undefined; // Revoking a refresh token also revokes any associated access tokens.
        this.tokenExpiration = undefined;
        this.scope = [];
    }

}

export namespace requestor{
    
    enum grantType {
        CLIENT_CREDENTIALS= 'client_credentials',
        INSTALLED_CLIENT= 'https://oauth.reddit.com/grants/installed_client'
    }

}