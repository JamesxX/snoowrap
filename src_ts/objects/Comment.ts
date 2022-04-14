import { snoowrapFactoryConstructible } from '../snoowrap/factory';
import Listing from './Listing';
import Submission from './Submission';
import VoteableContent from './VoteableContent';

export default interface Comment extends VoteableContent<Comment> {
    body_html: string;
    body: string;
    collapsed_reason: any; // ?
    collapsed: boolean;
    controversiality: number;
    depth: number;
    ignore_reports: boolean;
    /** True if comment author is the same as the Submission author */
    is_submitter: boolean;
    link_id: string;
    parent_id: string;
    removed: boolean;
    replies: Listing<Comment>;
    score_hidden: boolean;
    spam: boolean;
}

@snoowrapFactoryConstructible
export default class Comment extends VoteableContent<Comment> {

    constructor (options, _r, _hasFetched) {
        super(options, _r, _hasFetched);
        if (_hasFetched) {
            /**
             * If a comment is in a deep comment chain, reddit will send a single `more` object with name `t1__` in place of the
             * comment's replies. This is the equivalent of seeing a 'Continue this thread' link on the HTML site, and it indicates that
             * replies should be fetched by sending another request to view the deep comment alone, and parsing the replies from that.
             */
            if (this.replies instanceof Listing && !this.replies.length && this.replies._more && this.replies._more.name === 't1__') {
                this.replies = getEmptyRepliesListing(this);
            } else if (this.replies === '') {
                /**
                 * If a comment has no replies, reddit returns an empty string as its `replies` property rather than an empty Listing.
                 * This behavior is unexpected, so replace the empty string with an empty Listing.
                 */
                this.replies = this._r.newObject('Listing', {children: [], _more: emptyMoreObject, _isCommentList: true});
            } else if (this.replies._more && !this.replies._more.link_id) {
                this.replies._more.link_id = this.link_id;
            }
        }
    }

    public _transformApiResponse (response: any) {
        if (response instanceof Submission) {
            const children = response._children;
            response = response.comments[0];
            delete children[response.id];
            response._children = children;
            response._sort = this._sort || null;
            response._cb = this._cb || null;
            if (this._cb) {
                this._cb(response);
            }
            return response;
        }
        response[0]._sort = this._sort || null;
        return addEmptyRepliesListing(response[0]);
    }

    get _uri () : string {
        return !this.link_id
          ? `api/info?id=${this.name}`
          : `comments/${this.link_id.slice(3)}?comment=${this.name.slice(3)}${this._sort ? `&sort=${this._sort}` : ''}`;
    }

    public async fetchMore (options: any) {
        if (typeof options !== 'number') {
            options.append = true;
        }
        const comments : any = await this.replies.fetchMore(options);
        if (this._cb) {
            this._cb({_children: comments._children});
        }
        this.replies = comments;
        return comments;
    }

    public async fetchAll (options: any) {
        return this.fetchMore({...options, amount: Infinity});
    }

    public async lock () : Promise<this> {
        await this._post({url: 'api/lock', form: {id: this.name}});
        return this;
    }

    public async unlock () : Promise<this>{
        await this._post({url: 'api/unlock', form: {id: this.name}});
        return this;
    }
}
