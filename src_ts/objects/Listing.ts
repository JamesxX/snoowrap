import * as Snoowrap from "../snoowrap";

export default interface Listing<T> extends Array<T> {
	isFinished: boolean;
	is_finished: boolean;
}

export default class Listing<T> extends Array<T> {
	constructor(options: any, _r: Snoowrap) {
		super();
		if (!(this instanceof Listing)) {
			// Safari 9 has an incorrect implementation of classes that extend Arrays. As a workaround,
			// manually set the constructor and prototype.
			this.constructor = Listing;
			Object.setPrototypeOf(this, Listing.prototype);
		}
		this.push(...(options.children || []));
		this._r = _r;
		this._cachedLookahead = options._cachedLookahead;
		defaultsDeep(
			this,
			pick(options, Object.keys(INTERNAL_DEFAULTS)),
			INTERNAL_DEFAULTS
		);
		Object.assign(this._query, pick(options, ["before", "after"]));
		if (
			options.children &&
			options.children[options.children.length - 1] instanceof More
		) {
			this._setMore(this.pop());
		}
	}

	fetchMore(options: FetchMoreOptions): Listing<T> {
		const parsedOptions = defaults(
			typeof options === "number" ? { amount: options } : clone(options),
			// Accept either `skip_replies` or `skipReplies` for backwards compatibility.
			{ append: true, skipReplies: options.skip_replies }
		);
		if (
			typeof parsedOptions.amount !== "number" ||
			Number.isNaN(parsedOptions.amount)
		) {
			throw new InvalidMethodCallError(
				"Failed to fetch Listing. (`amount` parameter was missing or invalid)"
			);
		}
		if (parsedOptions.amount <= 0 || this.isFinished) {
			return parsedOptions.append
				? this._clone()
				: this._clone()._empty();
		}
		if (this._cachedLookahead) {
			const cloned = this._clone();
			cloned.push(
				...cloned._cachedLookahead.splice(0, parsedOptions.amount)
			);
			return cloned.fetchMore(
				parsedOptions.amount - cloned.length + this.length
			);
		}
		return this._more
			? this._fetchMoreComments(parsedOptions)
			: this._fetchMoreRegular(parsedOptions);
	}

	fetchAll(options?: FetchMoreOptions): Listing<T>;
	/* @deprecated */ fetchUntil(options?: FetchMoreOptions): Listing<T>;
	toJSON(): T[];
}

export interface ListingOptions {
	limit?: number;
	after?: string;
	before?: string;
	show?: string;
	count?: number;
}

export interface SortedListingOptions extends ListingOptions {
	time?: "all" | "hour" | "day" | "week" | "month" | "year";
}

interface FetchMoreOptions {
	amount: number;
	skipReplies?: boolean;
	skip_replies?: boolean;
	append?: boolean;
}
