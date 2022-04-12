import {EventEmitter} from 'events';
import { api_type } from '../utility/constants';
import { formatLivethreadPermissions, handleJsonErrors } from '../utility/helpers';
import Listing, { ListingOptions } from './Listing';
import RedditContent from './RedditContent';
import RedditUser from './RedditUser';
import Submission from './Submission';

export default interface LiveThread extends RedditContent<LiveThread> {
    description_html: string;
    description: string;
    nsfw: boolean;
    resources_html: string;
    resources: string;
    state: string;
    stream: EventEmitter;
    title: string;
    viewer_count_fuzzed: number | null;
    viewer_count: number | null;
    websocket_url: string | null;
}

export default class LiveThread extends RedditContent<LiveThread> {

	public _rawStream: WebSocket;
	public _populatedStream: EventEmitter;

	constructor (options, _r, _hasFetched) {
		super(options, _r, _hasFetched);
		this._rawStream = null;
		this._populatedStream = null;
		if (_hasFetched) {
			Object.defineProperty(this, 'stream', {get: () => {
				if (!this._populatedStream && this.websocket_url) {
					this._setupWebSocket();
				}
				return this._populatedStream;
			}});
		}
	  }

	  get _uri () {
		return `live/${this.id}/about`;
	  }

	_setupWebSocket () {
		this._rawStream = new WebSocket(this.websocket_url);
		this._populatedStream = new EventEmitter();
		const handler = data => {
			const parsed = this._r._populate(JSON.parse(data), {}, false);
			this._populatedStream.emit(parsed.type, parsed.payload);
		};
		/*if (typeof this._rawStream.on === 'function') {
		  this._rawStream.on('message', handler);
		} else {*/
			this._rawStream.onmessage = messageEvent => handler(messageEvent.data);
		//}
	}




	public async acceptContributorInvite(): Promise<this>{
		await this._post({url: `api/live/${this.id}/accept_contributor_invite`, form: {api_type}});
		return this;
	  }
	public async addUpdate(body: string): Promise<this>{
		const res = await this._post({url: `api/live/${this.id}/update`, form: {api_type, body}});
		handleJsonErrors(res);
		return this;
	}
	  
	public async closeStream(): Promise<void>{
		if (this._rawStream) {
		  this._rawStream.close();
		}
	}
	
	public async closeThread(): Promise<this>{
		await this._post({url: `api/live/${this.id}/close_thread`, form: {api_type}});
		return this;
	}
	public async deleteUpdate(options: { id: string; }): Promise<this>{
		const res = await this._post({
		  url: `api/live/${this.id}/delete_update`,
		  form: {api_type, id: `${options.id.startsWith('LiveUpdate_') ? '' : 'LiveUpdate_'}${options.id}`}
		});
		handleJsonErrors(res);
		return this;
	}

	public async editSettings(options: LiveThreadSettings): Promise<this>{
		const res = await this._post({
		  url: `api/live/${this.id}/edit`,
		  form: {api_type, description: options.description, nsfw: options.nsfw, resources: options.resources, title: options.title}
		});
		handleJsonErrors(res);
		return this;
	}

	public async getContributors(): Promise<RedditUser[]>{
		const contributors = await this._get({url: `live/${this.id}/contributors`});
		return Array.isArray(contributors[0]) ? contributors[0] : contributors;
	}

	public async getDiscussions(options?: ListingOptions): Promise<Listing<Submission>>{
		return this._getListing({uri: `live/${this.id}/discussions`, qs: options});
	}

	public async getRecentUpdates(options?: ListingOptions): Promise<Listing<LiveUpdate>>{
		return this._getListing({uri: `live/${this.id}`, qs: options});
	}

	public async inviteContributor(options: { name: string; permissions: Permissions[]}): Promise<this>{
		const res = await this._post({url: `api/live/${this.id}/invite_contributor`, form: {
			api_type,
			name: options.name,
			permissions: formatLivethreadPermissions(options.permissions),
			type: 'liveupdate_contributor_invite'
		}});
		handleJsonErrors(res);
		return this;
	}

	public async leaveContributor(): Promise<this>{
		await this._post({url: `api/live/${this.id}/leave_contributor`, form: {api_type}});
		return this;
	}

	public async removeContributor(options: { name: string; }): Promise<this>{
		const userId = (await this._r.getUser(options.name).fetch()).id;
		const res = await this._post({url: `api/live/${this.id}/rm_contributor`, form: {api_type, id: `t2_${userId}`}});
		handleJsonErrors(res);
		return this;
	}

	public async report(options: { reason: ReportReason; }): Promise<this>{
		const res = await this._post({url: `api/live/${this.id}/report`, form: {api_type, type: options.reason}});
		handleJsonErrors(res);
		return this;
	}

	public async revokeContributorInvite(options: { name: string; }): Promise<this>{
		const userId = (await this._r.getUser(options.name).fetch()).id;
		const res = await this._post({url: `api/live/${this.id}/rm_contributor_invite`, form: {api_type, id: `t2_${userId}`}});
		handleJsonErrors(res);
		return this;
	}

	public async setContributorPermissions(options: {
		name: string;
		permissions: Permissions[];
	}): Promise<this>{
		const res = await this._post({
			url: `api/live/${this.id}/set_contributor_permissions`,
			form: {api_type, name: options.name, permissions: formatLivethreadPermissions(options.permissions), type: 'liveupdate_contributor'}
		});
		handleJsonErrors(res);
		return this;
	}

	public async strikeUpdate(options: { id: string; }): Promise<this>{
		const res = await this._post({
		  url: `api/live/${this.id}/strike_update`,
		  form: {api_type, id: `${options.id.startsWith('LiveUpdate_') ? '' : 'LiveUpdate_'}${options.id}`}
		});
		handleJsonErrors(res);
		return this;
	}
}

type Permissions = 'update' | 'edit' | 'manage';
type ReportReason = 'spam' | 'vote-manipulation' | 'personal-information' | 'sexualizing-minors' | 'site-breaking';

export interface LiveThreadSettings {
  title: string;
  description?: string;
  resources?: string;
  nsfw?: boolean;
}

interface LiveUpdate {
  body: string;
  name: string;
  embeds: Embed[];
  mobile_embeds: MobileEmbed[];
  author: RedditUser;
  created: number;
  created_utc: number;
  body_html: string;
  stricken: boolean;
  id: string;
}

interface Embed {
  url: string;
  width: number;
  height: number;
}

interface MobileEmbed extends Embed {
  provider_url: string;
  original_url: string;
  version: string;
  provider_name: string;
  type: string;
  thumbnail_url: string;
  thumbnail_height: number;
  thumbnail_width: number;
}
