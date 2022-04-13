import Listing from "./Listing";
import RedditUser from "./RedditUser";
import ReplyableContent from "./ReplyableContent";
import Subreddit from "./Subreddit";

export default interface PrivateMessage
	extends ReplyableContent<PrivateMessage> {
	author: RedditUser;
	body_html: string;
	body: string;
	context: string;
	dest: string;
	distinguished: string | null;
	first_message_name: string;
	first_message: number;
	likes: any; // ?
	new: boolean;
	num_comments: number;
	parent_id: string;
	replies: Listing<PrivateMessage>;
	score: number;
	subject: string;
	subreddit_name_prefixed: string;
	subreddit: Subreddit;
	was_comment: boolean;
}

export default class PrivateMessage extends ReplyableContent<PrivateMessage> {
	get _uri() {
		return `message/messages/${this.name.slice(3)}`;
	}

	public async _transformApiResponse(response) {
		response[0].replies = buildRepliesTree(response[0].replies || []);
		return findMessageInTree(this.name, response[0]);
	}

	public async deleteFromInbox(): Promise<this> {
		await this._post({ url: "api/del_msg", form: { id: this.name } });
		return this;
	}

	public async markAsRead(): Promise<this> {
		await this._r.markMessagesAsRead([this]);
		return this;
	}

	public async markAsUnread(): Promise<this> {
		await this._r.markMessagesAsUnread([this]);
		return this;
	}

	public async muteAuthor(): Promise<this> {
		await this._post({
			url: "api/mute_message_author",
			form: { id: this.name },
		});
		return this;
	}

	public async unmuteAuthor(): Promise<this> {
		await this._post({
			url: "api/unmute_message_author",
			form: { id: this.name },
		});
		return this;
	}
}
