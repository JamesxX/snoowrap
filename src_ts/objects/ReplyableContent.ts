import { snoowrapFactoryConstructible } from '../snoowrap/factory';
import { api_type } from '../utility/constants';
import { handleJsonErrors } from '../utility/helpers';
import RedditContent from './RedditContent';

export default interface ReplyableContent<T extends ReplyableContent<T>> extends RedditContent<T> {
    _children: any
    _sort: any
    _cb: any
}

@snoowrapFactoryConstructible
export default class ReplyableContent<T extends ReplyableContent<T>> extends RedditContent<T> {

    public async approve(): Promise<this>{
        await this._post({url: 'api/approve', form: {id: this.name}});
        return this;
    }

    public async blockAuthor(): Promise<this> {
        await this._post({url: 'api/block', form: {id: this.name}});
        return this;
    }

    public async ignoreReports(): Promise<this>{
        await this._post({url: 'api/ignore_reports', form: {id: this.name}});
        return this;
    }

    public async remove(options?: { spam?: boolean }): Promise<this> {
        await this._post({url: 'api/remove', form: {spam: options.spam, id: this.name}});
        return this;
    }

    public async reply(text: string): Promise<ReplyableContent<T>>{
        const res = await this._post({
          url: 'api/comment',
          form: {api_type, text, thing_id: this.name}
        });
        handleJsonErrors(res);
        return res.json.data.things[0];
    }

    public async report(options?: { reason?: string }): Promise<this> {
        await this._post({url: 'api/report', form: {
          api_type, reason: 'other', other_reason: options.reason, thing_id: this.name
        }});
        return this;
    }

    public async unignoreReports(): Promise<this> {
        await this._post({url: 'api/unignore_reports', form: {id: this.name}});
        return this;
    }
}
