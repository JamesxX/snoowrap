import { consoleLogger, ILogger } from "./logger";

export interface configuration{
    endpointDomain: string,
    requestDelay: number,
    requestTimeout: number,
    continueAfterRatelimitError: boolean,
    retryErrorCodes: number[],
    maxRetryAttempts: number,
    warnings: boolean,
    debug: boolean,
    logger: ILogger,
    proxies: boolean
}

export function createConfig () {
    const config : configuration = {
        endpointDomain: 'reddit.com',
        requestDelay: 0,
        requestTimeout: 30000,
        continueAfterRatelimitError: false,
        retryErrorCodes: [502, 503, 504, 522],
        maxRetryAttempts: 3,
        warnings: true,
        debug: false,
        logger: new consoleLogger(),
        proxies: true
    };
    
    return config;
  }
  

export default class configurator{

    protected _config: configuration = createConfig()

    protected config (options = {}) {
        const invalidKey = Object.keys(options).find(key => !(key in this._config));
        if (invalidKey) {
            throw new TypeError(`Invalid config option '${invalidKey}'`);
        }
        return Object.assign(this._config, options);
    }
}