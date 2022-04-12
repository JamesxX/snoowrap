import Subreddit from './Subreddit';
import Listing, { ListingOptions } from './Listing';
import RedditContent from './RedditContent';
import RedditUser from './RedditUser';
import Submission from './Submission';

export default interface WikiPage extends RedditContent<WikiPage> {
    content_html: string;
    content_md: string;
    may_revise: boolean;
    revision_by: RedditUser;
    revision_date: number;

    subreddit: Subreddit;
    title: string
}

export default class WikiPage extends RedditContent<WikiPage> {

    get _uri () {
        return `r/${this.subreddit.display_name}/wiki/${this.title}`;
    }

    public async addEditor(options: { name: string; }): Promise<this> {
        await this._modifyEditor({name: options.name, action: 'add'});
        return this;
    }

    public async edit(options: EditOptions): Promise<this>{
        await this._post({
            url: `r/${this.subreddit.display_name}/api/wiki/edit`,
            form: {content: options.text, page: this.title, previous: options.previousRevision, reason: options.reason}
        });
        return this;
    }

    public async editSettings(options: Settings): Promise<this>{
        await this._post({
            url: `r/${this.subreddit.display_name}/wiki/settings/${this.title}`,
            form: {listed: options.listed, permlevel: options.permissionLevel}
        });
        return this;
    }

    public async getDiscussions(options?: ListingOptions): Promise<Listing<Submission>>{
        return this._getListing({uri: `r/${this.subreddit.display_name}/wiki/discussions/${this.title}`, qs: options});
    }

    public async getRevisions(options?: ListingOptions): Promise<Listing<WikiPageRevision>>{
        return this._getListing({uri: `r/${this.subreddit.display_name}/wiki/revisions/${this.title}`, qs: options});
    }

    public async getSettings(): Promise<Settings> {
        return this._get({url: `r/${this.subreddit.display_name}/wiki/settings/${this.title}`});
    }

    public async hideRevision(options: { id: string; }): Promise<this>{
        await this._post({
            url: `r/${this.subreddit.display_name}/api/wiki/hide`,
            params: {page: this.title, revision: options.id}
        });
        return this;
    }

    public async removeEditor(options: { name: string; }): Promise<this> {
        await this._modifyEditor({name: options.name, action: 'del'});
        return this;
      }

    public async revert(options: { id: string; }): Promise<this>{
        await this._post({
            url: `r/${this.subreddit.display_name}/api/wiki/revert`,
            params: {page: this.title, revision: options.id}
        });
        return this;
    }

    public async _modifyEditor ({name, action} : { name: string, action: string }) {
        return this._post({
            url: `r/${this.subreddit.display_name}/api/wiki/alloweditor/${action}`,
            form: {page: this.title, username: name}
        });
    }
}

export interface Settings {
  listed: boolean;
  permissionLevel: 0 | 1 | 2;
}

export interface EditOptions {
  text: string;
  reason?: string;
  previousRevision?: string;
}

export interface WikiPageRevision {
  timestamp: number;
  reason: string;
  page: string;
  id: string;
  author: RedditUser;
}
