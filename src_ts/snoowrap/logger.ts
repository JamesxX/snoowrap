import configurator from "./configurator";

export interface ILogger{
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    trace(...args: any[]): void;
}

export class consoleLogger implements ILogger {
    warn (...args: any[]) {
        // eslint-disable-next-line no-console
        console.warn('[warning]', ...args);
    }
    
    info (...args: any[]) {
        // eslint-disable-next-line no-console
        console.info('[info]', ...args);
    }
    
    debug (...args: any[]) {
        // eslint-disable-next-line no-console
        console.debug('[debug]', ...args);
    }
    
    trace (...args: any[]) {
        // eslint-disable-next-line no-console
        console.trace('[trace]', ...args);
    }
}

export default class logger extends configurator{

    public warn (...args: any[]) {
        if (this._config.warnings) { this._config.logger.warn(...args); }
    }
    
    public debug (...args: any[]) {
        if (this._config.debug) { this._config.logger.debug(...args); }
    }

}