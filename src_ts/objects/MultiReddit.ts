import RedditUser from "./RedditUser";
import RedditContent from "./RedditContent";
import Subreddit from "./Subreddit";

export default interface MultiReddit extends RedditContent<MultiReddit> {
	can_edit: boolean;
	copied_from: string | null;
	curator: RedditUser;
	description_html: string;
	description_md: string;
	display_name: string;
	icon_name: MultiRedditIcon;
	icon_url: string | null;
	key_color: string;
	path: string;
	subreddits: Subreddit[];
	visibility: MultiRedditVisibility;
	weighting_schema: MultiRedditWeightingSchema;
}

export default class MultiReddit extends RedditContent<MultiReddit> {
	constructor(options, _r, _hasFetched) {
		super(options, _r, _hasFetched);
		if (_hasFetched) {
			this.curator = _r.getUser(this.path.split("/")[2]);
			this.subreddits = this.subreddits.map((item) =>
				this._r.newObject(
					"Subreddit",
					(<any>item).data || { display_name: item.name }
				)
			);
		}
	}
	get _uri() {
		return `api/multi${this._path}?expand_srs=true`;
	}
	get _path() {
		return `/user/${this.curator.name}/m/${this.name}`;
	}

	public async addSubreddit(sub: Subreddit | string): Promise<this> {
		sub = typeof sub === "string" ? sub : sub.display_name;
		await this._put({
			url: `api/multi${this._path}/r/${sub}`,
			form: { model: JSON.stringify({ name: sub }) },
		});
		return this;
	}

	public async copy({ newName }: { newName: string }): Promise<MultiReddit> {
		const name = await this._r._getMyName();
		return this._post({
			url: "api/multi/copy",
			form: {
				from: this._path,
				to: `/user/${name}/m/${newName}`,
				display_name: newName,
			},
		});
	}

	public async delete(): Promise<this> {
		return this._delete({ url: `api/multi${this._path}` });
	}

	public async edit({
		name = "",
		description,
		icon_name,
		key_color,
		visibility,
		weighting_scheme,
	}: MultiRedditProperties): Promise<this> {
		const display_name = name.length ? name : this.name;
		return this._put({
			url: `api/multi${this._path}`,
			form: {
				model: JSON.stringify({
					description_md: description,
					display_name,
					icon_name,
					key_color,
					visibility,
					weighting_scheme,
				}),
			},
		});
	}

	public async removeSubreddit(sub: Subreddit | string): Promise<this> {
		await this._delete({
			url: `api/multi${this._path}/r/${
				typeof sub === "string" ? sub : sub.display_name
			}`,
		});
		return this;
	}

	public async rename({ newName }: { newName: string }): Promise<this> {
		const name = await this._r._getMyName();
		const res = await this._post({
			url: "api/multi/rename",
			form: {
				from: this._path,
				to: `/user/${name}/m/${newName}`,
				display_name: newName,
			},
		});
		this.name = res.name;
		return this;
	}
}

export interface MultiRedditProperties {
	name?: string;
	description?: string;
	visibility?: MultiRedditVisibility;
	icon_name?: MultiRedditIcon;
	key_color?: string;
	weighting_scheme?: MultiRedditWeightingSchema;
}

export type MultiRedditWeightingSchema = "classic" | "fresh";
export type MultiRedditVisibility = "private" | "public" | "hidden";
export type MultiRedditIcon =
	| "art and design"
	| "ask"
	| "books"
	| "business"
	| "cars"
	| "comics"
	| "cute animals"
	| "diy"
	| "entertainment"
	| "food and drink"
	| "funny"
	| "games"
	| "grooming"
	| "health"
	| "life advice"
	| "military"
	| "models pinup"
	| "music"
	| "news"
	| "philosophy"
	| "pictures and gifs"
	| "science"
	| "shopping"
	| "sports"
	| "style"
	| "tech"
	| "travel"
	| "unusual stories"
	| "video";
