import Subreddit from "./Subreddit";
import RedditContent from "./RedditContent";
import RedditUser from "./RedditUser";
import ModmailConversationAuthor from "./ModmailConversationAuthor";

export enum conversationStates {
	New = 0,
	InProgress = 1,
	Archived = 2,
}

export enum modActionStates {
	Highlight = 0,
	UnHighlight = 1,
	Archive = 2,
	UnArchive = 3,
	ReportedToAdmins = 4,
	Mute = 5,
	Unmute = 6,
}

export interface ModmailMessage {
	body: string;
	bodyMarkdown: string;
	author: RedditUser;
	isInternal: boolean;
	date: string;
	id: string;
}

export interface Author {
	isMod: boolean;
	isAdmin: boolean;
	name: string;
	isOp: boolean;
	isParticipant: boolean;
	isHidden: boolean;
	id: any;
	isDeleted: boolean;
}

export interface Owner {
	displayName: string;
	type: string;
	id: string;
}

export interface ObjId {
	id: string;
	key: string;
}

export default interface ModmailConversation
	extends RedditContent<ModmailConversation> {
	isAuto: boolean;
	objIds: ObjId[];
	isRepliable: boolean;
	lastUserUpdate?: any;
	isInternal: boolean;
	lastModUpdate: Date;
	lastUpdated: Date;
	authors: Author[];
	// sometimes an Owner, sometimes a Subreddit
	owner: Owner | Subreddit;
	id: string;
	isHighlighted: boolean;
	subject: string;
	participant: ModmailConversationAuthor;
	state: number;
	lastUnread?: any;
	numMessages: number;
	messages?: ModmailMessage[];
}

export default class ModmailConversation extends RedditContent<ModmailConversation> {
	conversationStates = conversationStates;
	modActionStates = modActionStates;

	get _uri() {
		return `api/mod/conversations/${this.id}?markRead=false`;
	}

	_transformApiResponse(response) {
		response.conversation.owner = this._r.newObject("Subreddit", {
			id: response.conversation.owner.id,
			display_name: response.conversation.owner.displayName,
		});
		response.conversation.participant = this._r.newObject(
			"ModmailConversationAuthor",
			response.user.name,
			true
		);
		for (let author of response.conversation.authors) {
			author = this._r.newObject(
				"ModmailConversationAuthor",
				author,
				true
			);
		}

		const conversationObjects = ModmailConversation._getConversationObjects(
			response.conversation,
			response
		);
		return this._r.newObject(
			"ModmailConversation",
			{
				...conversationObjects,
				...response.conversation,
			},
			true
		);
	}

	static _getConversationObjects(conversation, response) {
		const conversationObjects = {};
		for (const objId of conversation.objIds) {
			if (!conversationObjects[objId.key]) {
				conversationObjects[objId.key] = [];
			}
			conversationObjects[objId.key].push(response[objId.key][objId.id]);
		}
		return conversationObjects;
	}

	public async reply(
		body: string,
		isAuthorHidden?: boolean,
		isInternal?: boolean
	): Promise<this> {
		return this._post({
			url: `api/mod/conversations/${this.id}`,
			form: {
				body,
				isAuthorHidden,
				isInternal,
			},
		});
	}

	get name() {
		return this.id;
	}

	public async getParticipant(): Promise<ModmailConversationAuthor> {
		const res = await this._get({
			url: `api/mod/conversations/${this.id}/user`,
		});
		return this._r.newObject("ModmailConversationAuthor", res, true);
	}

	public isRead(): boolean {
		return this.lastUnread === null;
	}

	public async read(): Promise<this> {
		return this._r.markNewModmailConversationsAsRead([this.id]);
	}

	public async unread(): Promise<this> {
		return this._r.markNewModmailConversationsAsUnread([this.id]);
	}

	public async mute(): Promise<this> {
		return this._post({ url: `api/mod/conversations/${this.id}/mute` });
	}

	public async unmute(): Promise<this> {
		return this._post({ url: `api/mod/conversations/${this.id}/unmute` });
	}

	public async highlight(): Promise<this> {
		return this._post({
			url: `api/mod/conversations/${this.id}/highlight`,
		});
	}

	public async unhighlight(): Promise<this> {
		return this._delete({
			url: `api/mod/conversations/${this.id}/highlight`,
		});
	}

	public async archive(): Promise<this> {
		return this._post({ url: `api/mod/conversations/${this.id}/archive` });
	}

	public async unarchive(): Promise<this> {
		return this._post({
			url: `api/mod/conversations/${this.id}/unarchive`,
		});
	}
}
