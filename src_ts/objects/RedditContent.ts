import { cloneDeep, mapValues, pick } from 'lodash';
import {snoowrapFactoryConstructible} from '../snoowrap/factory'
import snoowrap from '../snoowrap/snoowrap'
import { SUBREDDIT_KEYS, USER_KEYS } from '../utility/constants';
import Listing from './Listing';

export default interface RedditContent<T extends RedditContent<T>>{
    created_utc: number;
    created: number;
    id: string;
    name: string;
}

@snoowrapFactoryConstructible
export default class RedditContent<T extends RedditContent<T>>{
    protected _fetch?: T;

    constructor(options: any, protected _r: snoowrap, protected _hasFetched: boolean){
        this._fetch = undefined;
        this._hasFetched = !!_hasFetched;
    }

    public async fetch(): Promise<T>{
        if (!this._fetch) {
            let res = await this._r._get({url: this._uri});
            res = this._transformApiResponse(res);
            this._fetch = res;
        }
        return this._fetch!;
    }

    public refresh(): Promise<T>{
        this._fetch = undefined;
        return this.fetch();
    }

    public toJSON() {
        return mapValues(this.#stripPrivateProps(), (value, key) => {
            if (value instanceof RedditContent && !value._hasFetched) {
              if (value.constructor.name === 'RedditUser' && USER_KEYS.has(key)) {
                return value.name;
              }
              if (value.constructor.name === 'Subreddit' && SUBREDDIT_KEYS.has(key)) {
                return (<any>value).display_name;
              }
            }
            return (<any>value) && (<any>value).toJSON ? (<any>value).toJSON() : value;
        });
    }

    #stripPrivateProps () : Partial<this> {
        return pick(this, Object.keys(this).filter(key => !key.startsWith('_')));
    }

    protected _transformApiResponse (response: any) {
        return response;
    }

    public _clone ({deep = false} = {}) {
        const clonedProps = mapValues(this, value => {
            if (deep) {
                return value instanceof RedditContent || value instanceof Listing ? value._clone({deep}) : cloneDeep(value);
            }
            return value;
        });
        return this._r.newObject(this.constructor.name, clonedProps, this._hasFetched);
    }

    public _getListing (...args: any) {
        return this._r._getListing(...args);
    }

    get _uri () : string { return '' }

    public _get( options: any ){ return this._r._get({...options })}
    public _delete( options: any ){ return this._r._delete({...options })}
    public _head( options: any ){ return this._r._head({...options })}
    public _patch( options: any ){ return this._r._patch({...options })}
    public _post( options: any ){ return this._r._post({...options })}
    public _put( options: any ){ return this._r._put({...options })}


}