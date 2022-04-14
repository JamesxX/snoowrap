import { snoowrapFactoryConstructible } from "../snoowrap/factory";
import { USERNAME_REGEX } from "../utility/constants";
import { InvalidMethodCallError, InvalidUserError } from "../utility/errors";
import Comment from "./Comment";
import Listing from "./Listing";
import MultiReddit from "./MultiReddit";
import RedditContent from "./RedditContent";
import Submission from "./Submission";
import Subreddit from "./Subreddit";

export default interface RedditUser extends RedditContent<RedditUser> {
	/** Number of Reddit coins, only returned for your own user */
	coins?: number;
	comment_karma: number;
	/** Only returned for your own user */
	features?: Features;
	/** Only returned for your own user */
	force_password_reset?: boolean;
	/** Only returned for your own user */
	gold_creddits?: number;
	/** Only returned for your own user */
	gold_expiration?: number | null;
	/** Only returned for your own user */
	has_android_subscription?: boolean;
	/** Only returned for your own user */
	has_external_account?: boolean;
	/** Only returned for your own user */
	has_ios_subscription?: boolean;
	/** Only returned for your own user */
	has_mail?: boolean;
	has_mod_mail: boolean;
	/** Only returned for your own user */
	has_paypal_subscription?: boolean;
	/** Only returned for your own user */
	has_stripe_subscription?: boolean;
	has_subscribed: boolean;
	/** Only returned for your own user */
	has_subscribed_to_premium?: boolean;
	has_verified_mail: boolean;
	/** Only returned for your own user */
	has_visited_new_profile?: boolean;
	hide_from_robots: boolean;
	/** Image URL of the user's avatar */
	icon_img: string;
	/** Only returned for your own user */
	in_beta?: boolean;
	/** Only returned for your own user */
	in_chat?: boolean;
	/** Only returned for your own user */
	in_redesign_beta?: boolean;
	/** Only returned for your own user */
	inbox_count?: number;
	is_employee: boolean;
	/** Only returned for other users, not yourself */
	is_friend?: boolean;
	is_gold: boolean;
	is_mod: boolean;
	/** Only returned for your own user */
	is_sponsor?: boolean;
	/** Only returned for your own user */
	is_suspended?: boolean;
	link_karma: number;
	modhash?: string | null;
	/** Only returned for your own user */
	new_modmail_exists?: boolean | null;
	/** Only returned for your own user */
	num_friends?: number;
	/** Only returned for your own user */
	oauth_client_id?: string;
	/** Only returned for your own user */
	over_18?: boolean;
	/** Only returned for your own user */
	pref_autoplay?: boolean;
	/** Only returned for your own user */
	pref_clickgadget?: number;
	/** Only returned for your own user */
	pref_geopopular?: string;
	/** Only returned for your own user */
	pref_nightmode?: boolean;
	/** Only returned for your own user */
	pref_no_profanity?: boolean;
	pref_show_snoovatar: boolean;
	/** Only returned for your own user */
	pref_show_trending?: boolean;
	/** Only returned for your own user */
	pref_show_twitter?: boolean;
	/** Only returned for your own user */
	pref_top_karma_subreddits?: boolean;
	/** Only returned for your own user */
	pref_video_autoplay?: boolean;
	/** Only returned for your own user */
	seen_layout_switch?: boolean;
	/** Only returned for your own user */
	seen_premium_adblock_modal?: boolean;
	/** Only returned for your own user */
	seen_redesign_modal?: boolean;
	/** Only returned for your own user */
	seen_subreddit_chat_ftux?: boolean;
	subreddit: Subreddit | null;
	/** Only returned for your own user */
	suspension_expiration_utc?: number | null;
	verified: boolean;
}

@snoowrapFactoryConstructible
export default class RedditUser extends RedditContent<RedditUser> {
	get _uri() {
		if (typeof this.name !== "string" || !USERNAME_REGEX.test(this.name)) {
			throw new InvalidUserError(this.name);
		}
		return `user/${this.name}/about`;
	}

	public async assignFlair(options: any): Promise<this> {
		await this._r._assignFlair({ ...options, name: this.name });
		return this;
	}

	public async friend(options: { note: string }): Promise<this> {
		await this._put({
			url: `api/v1/me/friends/${this.name}`,
			data: { user: this.name, note: options.note },
		});
		return this;
	}

	public async getComments(options?: any): Promise<Listing<Comment>> {
		return this._getListing({
			uri: `user/${this.name}/comments`,
			qs: options,
		});
	}

	public async getDownvotedContent(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/downvoted`,
			qs: options,
		});
	}

	public async getFriendInformation(): Promise<any> {
		return this._get({ url: `api/v1/me/friends/${this.name}` });
	}

	public async getGildedContent(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/gilded`,
			qs: options,
		});
	}

	public async getHiddenContent(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/hidden`,
			qs: options,
		});
	}

	public async getMultireddit(name: string): Promise<MultiReddit> {
		return this._r.newObject("MultiReddit", { name, curator: this });
	}

	public async getMultireddits(): Promise<MultiReddit[]> {
		return this._get({
			url: `api/multi/user/${this.name}`,
			params: { expand_srs: true },
		});
	}

	public async getOverview(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/overview`,
			qs: options,
		});
	}

	public async getSavedContent(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/saved`,
			qs: options,
		});
	}

	public async getSubmissions(options?: any): Promise<Listing<Submission>> {
		return this._getListing({
			uri: `user/${this.name}/submitted`,
			qs: options,
		});
	}

	public async getTrophies(): Promise<any> {
		return this._get({ url: `api/v1/user/${this.name}/trophies` });
	}

	public async getUpvotedContent(
		options?: any
	): Promise<Listing<Comment | Submission>> {
		return this._getListing({
			uri: `user/${this.name}/upvoted`,
			qs: options,
		});
	}

	public async giveGold(months: string): Promise<any> {
		/**
		 * Ideally this would allow for more than 36 months by sending multiple requests, but I don't have the resources to test
		 * that code, and it's probably better that such a big investment be deliberate anyway.
		 */
		if (typeof months !== "number" || months < 1 || months > 36) {
			throw new InvalidMethodCallError(
				"Invalid argument to RedditUser#giveGold; `months` must be between 1 and 36."
			);
		}
		return this._post({
			url: `api/v1/gold/give/${this.name}`,
			form: { months },
		});
	}

	unfriend(): Promise<any> {
		return this._delete({ url: `api/v1/me/friends/${this.name}` });
	}
}

export interface Features {
	chat: boolean;
	chat_group_rollout: boolean;
	chat_rollout: boolean;
	chat_subreddit: boolean;
	do_not_track: boolean;
	email_verification: ExperimentFeature;
	mweb_sharing_clipboard: ExperimentFeature;
	mweb_xpromo_revamp_v2: ExperimentFeature;
	show_amp_link: boolean;
	show_nps_survey: boolean;
	spez_modal: boolean;
	top_content_email_digest_v2: ExperimentFeature;
	live_happening_now: boolean;
	adserver_reporting: boolean;
	geopopular: boolean;
	legacy_search_pref: boolean;
	listing_service_rampup: boolean;
	mobile_web_targeting: boolean;
	default_srs_holdout: ExperimentFeature;
	geopopular_ie: ExperimentFeature;
	users_listing: boolean;
	show_user_sr_name: boolean;
	whitelisted_pms: boolean;
	sticky_comments: boolean;
	upgrade_cookies: boolean;
	ads_prefs: boolean;
	new_report_flow: boolean;
	block_user_by_report: boolean;
	ads_auto_refund: boolean;
	orangereds_as_emails: boolean;
	mweb_xpromo_modal_listing_click_daily_dismissible_ios: boolean;
	adzerk_do_not_track: boolean;
	expando_events: boolean;
	eu_cookie_policy: boolean;
	utm_comment_links: boolean;
	force_https: boolean;
	activity_service_write: boolean;
	pokemongo_content: ExperimentFeature;
	post_to_profile_beta: boolean;
	reddituploads_redirect: boolean;
	outbound_clicktracking: boolean;
	new_loggedin_cache_policy: boolean;
	inbox_push: boolean;
	https_redirect: boolean;
	search_dark_traffic: boolean;
	mweb_xpromo_interstitial_comments_ios: boolean;
	live_orangereds: boolean;
	programmatic_ads: boolean;
	give_hsts_grants: boolean;
	pause_ads: boolean;
	show_recommended_link: boolean;
	mweb_xpromo_interstitial_comments_android: boolean;
	ads_auction: boolean;
	screenview_events: boolean;
	new_report_dialog: boolean;
	moat_tracking: boolean;
	subreddit_rules: boolean;
	mobile_settings: boolean;
	adzerk_reporting_2: boolean;
	mobile_native_banner: boolean;
	ads_auto_extend: boolean;
	interest_targeting: boolean;
	post_embed: boolean;
	seo_comments_page_holdout: ExperimentFeature;
	scroll_events: boolean;
	mweb_xpromo_modal_listing_click_daily_dismissible_android: boolean;
	"302_to_canonicals": boolean;
	activity_service_read: boolean;
	adblock_test: boolean;
	geopopular_in: ExperimentFeature;
}

export interface ExperimentFeature {
	owner: string;
	variant: string;
	experiment_id: number;
}
