import {
	BaseSearchOptions,
	ModAction,
	SubmitLinkOptions,
	SubmitSelfPostOptions,
} from "../snoowrap";

import {snoowrap_sortOptions as Sort} from "../snoowrap/snoowrap"
import Comment from "./Comment";
import Listing, { ListingOptions } from "./Listing";
import PrivateMessage from "./PrivateMessage";
import RedditContent from "./RedditContent";
import RedditUser from "./RedditUser";
import Submission from "./Submission";
import { RichTextFlair } from "./VoteableContent";
import WikiPage, { WikiPageRevision } from "./WikiPage";
import ModmailConversation from "./ModmailConversation";
import { api_type } from "../utility/constants";
import { handleJsonErrors } from "../utility/helpers";
import { chunk, flatten, map } from "lodash";

export default interface Subreddit extends RedditContent<Subreddit> {
	accounts_active_is_fuzzed: boolean;
	accounts_active: number;
	active_user_count: number;
	advertiser_category: string | null;
	all_original_content: boolean;
	allow_discovery: boolean;
	allow_images: boolean;
	allow_videogifs: boolean;
	allow_videos: boolean;
	/** HEX color code */
	banner_background_color: string;
	/** URL of the banner image used on desktop Reddit */
	banner_background_image: string;
	/** URL of the banner image used on the mobile Reddit app */
	banner_img: string;
	banner_size: [number, number] | null;
	can_assign_link_flair: boolean;
	can_assign_user_flair: boolean;
	collapse_deleted_comments: boolean;
	comment_score_hide_mins: number;
	/** Image URL of the subreddit icon */
	community_icon: string;
	description_html: string;
	description: string;
	display_name: string;
	display_name_prefixed: string;
	emojis_custom_size: [number, number] | null;
	emojis_enabled: boolean;
	has_menu_widget: boolean;
	header_img: string | null;
	header_size: [number, number] | null;
	header_title: string | null;
	hide_ads: boolean;
	icon_img: string;
	icon_size: [number, number] | null;
	is_enrolled_in_new_modmail: boolean | null;
	key_color: string;
	lang: string;
	link_flair_enabled: boolean;
	link_flair_position: "" | "left" | "right";
	/** Will be null if user is not subscribed to this subreddit */
	notification_level: string | null;
	over18: boolean;
	/** HEX color code */
	primary_color: string;
	public_description_html: string;
	public_description: string;
	public_traffic: boolean;
	quarantine: boolean;
	show_media_preview: boolean;
	show_media: boolean;
	spoilers_enabled: boolean;
	submission_type: LinkType;
	submit_link_label: string | null;
	submit_text_html: string;
	submit_text_label: string | null;
	submit_text: string;
	subreddit_type: SubredditType;
	subscribers: number;
	suggested_comment_sort: Sort | null;
	title: string;
	url: string;
	user_can_flair_in_sr: boolean;
	user_flair_background_color: string | null;
	user_flair_css_class: string | null;
	user_flair_enabled_in_sr: boolean;
	user_flair_position: "" | "left" | "right";
	user_flair_richtext: RichTextFlair[];
	user_flair_template_id: string | null;
	user_flair_text: string | null;
	user_flair_text_color: "dark" | "light" | null;
	user_has_favorited: boolean;
	user_is_banned: boolean;
	user_is_contributor: boolean;
	user_is_moderator: boolean;
	user_is_muted: boolean;
	user_is_subscriber: boolean;
	user_sr_flair_enabled: boolean;
	user_sr_theme_enabled: boolean;
	whitelist_status: string;
	wiki_enabled: boolean;
	wls: number;
}

export default class Subreddit extends RedditContent<Subreddit> {
	get _uri() {
		return `r/${this.display_name}/about`;
	}

	_transformApiResponse(response) {
		if (!(response instanceof Subreddit)) {
			throw new TypeError(
				`The subreddit /r/${this.display_name} does not exist.`
			);
		}
		return response;
	}

	public async _deleteFlairTemplates({ flair_type }) {
		await this._post({
			url: `r/${this.display_name}/api/clearflairtemplates`,
			form: { api_type, flair_type },
		});
		return this;
	}

	async _createFlairTemplate({
		text,
		css_class,
		cssClass = css_class,
		flair_type,
		text_editable = false,
		textEditable = text_editable,
	}) {
		await this._post({
			url: `r/${this.display_name}/api/flairtemplate`,
			form: {
				api_type,
				text,
				css_class: cssClass,
				flair_type,
				text_editable: textEditable,
			},
		});
		return this;
	}

	_getFlairOptions({ name, link, is_newlink } = {}) {
		// TODO: Add shortcuts for this on RedditUser and Submission
		return this._post({
			url: `r/${this.display_name}/api/flairselector`,
			form: { name, link, is_newlink },
		});
	}

	public async acceptModeratorInvite(): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/accept_moderator_invite`,
			form: { api_type },
		});
		handleJsonErrors(res);
		return this;
	}

	public async addContributor(options: { name: string }): Promise<this> {
		return this._friend({ name, type: "contributor" });
	}
	public async addWikiContributor(options: { name: string }): Promise<this> {
		return this._friend({ name, type: "wikicontributor" });
	}
	public async banUser(options: BanOptions): Promise<this> {
		return this._friend({
			name,
			ban_message: options.banMessage,
			ban_reason: options.banReason,
			duration: options.duration,
			note: options.banNote,
			type: "banned",
		});
	}
	public async configureFlair(options: FlairConfig): Promise<this> {
		await this._post({
			url: `r/${this.display_name}/api/flairconfig`,
			form: {
				api_type,
				flair_enabled: options.userFlairEnabled,
				flair_position: options.userFlairPosition,
				flair_self_assign_enabled: options.userFlairSelfAssignEnabled,
				link_flair_position: options.linkFlairPosition,
				link_flair_self_assign_enabled: options.linkFlairSelfAssignEnabled,
			},
		});
		return this;
	}
	public async createLinkFlairTemplate(options: FlairParams): Promise<this> {
		return this._createFlairTemplate({
			...options,
			flair_type: "LINK_FLAIR",
		});
	}
	public async createUserFlairTemplate(options: FlairParams): Promise<this> {
		return this._createFlairTemplate({
			...options,
			flair_type: "USER_FLAIR",
		});
	}
	public async deleteAllLinkFlairTemplates(): Promise<this> {
		return this._deleteFlairTemplates({ flair_type: "LINK_FLAIR" });
	}

	public async deleteAllUserFlairTemplates(): Promise<this> {
		return this._deleteFlairTemplates({ flair_type: "USER_FLAIR" });
	}

	public async deleteBanner(): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/delete_sr_banner`,
			form: { api_type },
		});
		handleJsonErrors(res);
		return this;
	}
	public async deleteFlairTemplate({flair_template_id}: {
		flair_template_id: string;
	}): Promise<this> {
		await this._post({
			url: `r/${this.display_name}/api/deleteflairtemplate`,
			form: { api_type, flair_template_id },
		});
		return this;
	}
	public async deleteHeader(): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/delete_sr_header`,
			form: { api_type },
		});
		handleJsonErrors(res);
		return this;
	}
	public async deleteIcon(): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/delete_sr_icon`,
			form: { api_type },
		});
		handleJsonErrors(res);
		return this;
	}
	public async deleteImage({imageName}: { imageName: string }): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/delete_sr_img`,
			form: { api_type, img_name: imageName },
		});
		handleJsonErrors(res);
		return this;
	}
	public async deleteUserFlair(name: string): Promise<this> {
		await this._post({
			url: `r/${this.display_name}/api/deleteflair`,
			form: { api_type, name },
		});
		return this;
	}
	public async editSettings(options: SubredditSettings): Promise<this> {
		const currentValues = await this.getSettings();
		const name = (await this.fetch()).name;
		await this._r._createOrEditSubreddit({
			...renameKey(currentValues, "subreddit_type", "type"),
			...options,
			sr: name,
		});
		return this;
	}
	public async getBannedUsers(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<BannedUser>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/banned`,
			qs: renameKey(options, "name", "user"),
		});
	}
	public async getContributors(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<Contributor>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/contributors`,
			qs: renameKey(options, "name", "user"),
		});
	}
	public async getControversial(
		options?: ListingOptions & { time?: string }
	): Promise<Listing<Submission>> {
		return this._r.getControversial(this.display_name, options);
	}
	public async getEdited(
		options?: ListingOptions & { only?: "links" | "comments" }
	): Promise<Listing<Submission | Comment>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/edited`,
			qs: options,
		});
	}
	public async getHot(
		options?: ListingOptions
	): Promise<Listing<Submission>> {
		return this._r.getHot(this.display_name, options);
	}
	public async getLinkFlairTemplates(
		linkId?: string
	): Promise<FlairTemplate[]> {
		const options = linkId ? { link: linkId } : { is_newlink: true };
		const res = await this._getFlairOptions(options);
		return res.choices;
	}
	public async getModerationLog(
		opts?: ListingOptions & { mods?: string[]; type?: ModActionType }
	): Promise<Listing<ModAction>> {
		const parsedOptions = omit(
			{ ...options, mod: options.mods && options.mods.join(",") },
			"mods"
		);
		return this._getListing({
			uri: `r/${this.display_name}/about/log`,
			qs: parsedOptions,
		});
	}
	public async getModerators(
		options?: ListingOptions & { name?: string }
	): Promise<RedditUser[]> {
		return this._get({
			url: `r/${this.display_name}/about/moderators`,
			params: { user: name },
		});
	}
	public async getModmail(
		options?: ListingOptions
	): Promise<Listing<PrivateMessage>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/message/moderator`,
			qs: options,
		});
	}
	public async getNewModmailConversations(
		options?: ListingOptions
	): Promise<Listing<ModmailConversation>> {
		return this._r.getNewModmailConversations({
			...options,
			entity: this.display_name,
		});
	}
	public async getModqueue(
		options?: ListingOptions & { only?: "links" | "comments" }
	): Promise<Listing<Submission | Comment>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/modqueue`,
			qs: options,
		});
	}
	public async getMutedUsers(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<MutedUser>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/muted`,
			qs: renameKey(options, "name", "user"),
		});
	}
	public async getMyFlair(): Promise<FlairTemplate> {
		return (await this._getFlairOptions()).current;
	}
	public async getNew(
		options?: ListingOptions
	): Promise<Listing<Submission>> {
		return this._r.getNew(this.display_name, options);
	}
	public async getNewComments(
		options?: ListingOptions
	): Promise<Listing<Comment>> {
		return this._r.getNewComments(this.display_name, options);
	}
	public async getRandomSubmission(): Promise<Submission> {
		return this._r.getRandomSubmission(this.display_name);
	}
	public async getRecommendedSubreddits(options?: {
		omit?: string[];
	}): Promise<Subreddit[]> {
		const toOmit = options.omit && options.omit.join(",");
		const names = await this._get({
			url: `api/recommend/sr/${this.display_name}`,
			params: { omit: toOmit },
		});
		return map(names, "sr_name");
	}
	public async getReports(
		options?: ListingOptions & { only?: "links" | "comments" }
	): Promise<Listing<Submission | Comment>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/reports`,
			qs: options,
		});
	}
	public async getRising(
		options?: ListingOptions
	): Promise<Listing<Submission>> {
		return this._r.getRising(this.display_name, options);
	}
	public async getRules(): Promise<{ rules: Rule[]; site_rules: string[] }> {
		return this._get({ url: `r/${this.display_name}/about/rules` });
	}
	public async getSettings(): Promise<SubredditSettings> {
		return this._get({ url: `r/${this.display_name}/about/edit` });
	}
	public async getSpam(
		options?: ListingOptions & { only?: "links" | "comments" }
	): Promise<Listing<Submission | Comment>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/spam`,
			qs: options,
		});
	}

	public async getSticky({num}: { num?: number }): Promise<Submission> {
		return this._get({
			url: `r/${this.display_name}/about/sticky`,
			params: { num },
		});
	}
	public async getStylesheet(): Promise<string> {
		return this._get({
			url: `r/${this.display_name}/stylesheet`,
			json: false,
		});
	}
	public async getSubmitText(): Promise<string> {
		const res = await this._get({
			url: `r/${this.display_name}/api/submit_text`,
		});
		return res.submit_text;
	}
	public async getTop(
		options?: ListingOptions & { time?: Timespan }
	): Promise<Listing<Submission>> {
		return this._r.getTop(this.display_name, options);
	}
	public async getUnmoderated(
		options?: ListingOptions & { only?: "links" | "comments" }
	): Promise<Listing<Submission | Comment>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/unmoderated`,
			qs: options,
		});
	}
	public async getUserFlair(name: string): Promise<FlairTemplate> {
		const res = await this._getFlairOptions({ name });
		return res.current;
	}
	public async getUserFlairList(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<UserFlair>> {
		return this._getListing({
			uri: `r/${this.display_name}/api/flairlist`,
			qs: options,
			_transform: (response) => {
				/**
				 * For unknown reasons, responses from the api/flairlist endpoint are formatted differently than responses from all other
				 * Listing endpoints. Most Listing endpoints return an object with a `children` property containing the Listing's children,
				 * and `after` and `before` properties corresponding to the `after` and `before` querystring parameters that a client should
				 * use in the next request. However, the api/flairlist endpoint returns an object with a `users` property containing the
				 * Listing's children, and `next` and `prev` properties corresponding to the `after` and `before` querystring parameters. As
				 * far as I can tell, there's no actual reason for this difference. >_>
				 */
				response.after = response.next || null;
				response.before = response.prev || null;
				response.children = response.users;
				return this._r.newObject("Listing", response);
			},
		});
	}
	public async getUserFlairTemplates(): Promise<FlairTemplate[]> {
		const res = await this._getFlairOptions();
		return res.choices;
	}
	public async getWikiBannedUsers(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<BannedUser>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/wikibanned`,
			qs: renameKey(options, "name", "user"),
		});
	}
	public async getWikiContributors(
		options?: ListingOptions & { name?: string }
	): Promise<Listing<Contributor>> {
		return this._getListing({
			uri: `r/${this.display_name}/about/wikicontributors`,
			qs: renameKey(options, "name", "user"),
		});
	}
	public async getWikiPage(title: string): Promise<WikiPage> {
		return this._r.newObject("WikiPage", { subreddit: this, title });
	}
	public async getWikiPages(): Promise<WikiPage[]> {
		const res = await this._get({
			url: `r/${this.display_name}/wiki/pages`,
		});
		return res.map((title) => this.getWikiPage(title));
	}
	public async getWikiRevisions(
		options?: ListingOptions
	): Promise<Listing<WikiPageRevision>> {
		return this._getListing({
			uri: `r/${this.display_name}/wiki/revisions`,
			qs: options,
		});
	}
	public async hideMyFlair(): Promise<this> {
		return this._setMyFlairVisibility(false);
	}
	public async inviteModerator(options: {
		name: string;
		permissions?: ModeratorPermission[];
	}): Promise<this> {
		return this._friend({
			name,
			permissions: formatModPermissions(permissions),
			type: "moderator_invite",
		});
	}

	public async leaveContributor(): Promise<this> {
		const name = (await this.fetch()).name;
		const res = await this._post({
			url: "api/leavecontributor",
			form: { id: name },
		});
		handleJsonErrors(res);
		return this;
	}
	public async leaveModerator(): Promise<this> {
		const name = (await this.fetch()).name;
		const res = await this._post({
			url: "api/leavemoderator",
			form: { id: name },
		});
		handleJsonErrors(res);
		return this;
	}
	public async muteUser(options: { name: string }): Promise<this> {
		return this._friend({ name, type: "muted" });
	}
	public async removeContributor(options: { name: string }): Promise<this> {
		return this._unfriend({ name, type: "contributor" });
	}
	public async removeModerator(options: { name: string }): Promise<this> {
		return this._unfriend({ name, type: "moderator" });
	}
	public async removeWikiContributor(options: {
		name: string;
	}): Promise<this> {
		return this._unfriend({ name, type: "wikicontributor" });
	}
	public async revokeModeratorInvite(options: {
		name: string;
	}): Promise<this> {
		return this._unfriend({ name, type: "moderator_invite" });
	}
	public async search(
		options: BaseSearchOptions
	): Promise<Listing<Submission>> {
		return this._r.search({
			...options,
			subreddit: this,
			restrictSr: true,
		});
	}
	public async selectMyFlair(options: {
		flair_template_id: string;
		text?: string;
	}): Promise<this> {
		/**
		 * NOTE: This requires `identity` scope in addition to `flair` scope, since the reddit api needs to be passed a username.
		 * I'm not sure if there's a way to do this without requiring additional scope.
		 */
		const name = await this._r._getMyName();
		await this._r._selectFlair({
			...options,
			subredditName: this.display_name,
			name,
		});
		return this;
	}

	async _setMyFlairVisibility(flair_enabled) {
		await this._post({
			url: `r/${this.display_name}/api/setflairenabled`,
			form: { api_type, flair_enabled },
		});
		return this;
	}

	public async setModeratorPermissions(options: {
		name: string;
		permissions: ModeratorPermission;
	}): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/setpermissions`,
			form: {
				api_type,
				name,
				permissions: formatModPermissions(permissions),
				type: "moderator",
			},
		});
		handleJsonErrors(res);
		return this;
	}
	public async setMultipleUserFlairs(
		flairArray: Array<{
			name: string;
			text: string;
			cssClass: string;
		}>
	): Promise<this> {
		const csvLines = flairArray.map((item) => {
			// reddit expects to receive valid CSV data, which each line having the form `username,flair_text,css_class`.
			return [
				item.name,
				item.text || item.flairText || item.flair_text || "",
				item.cssClass ||
					item.css_class ||
					item.flairCssClass ||
					item.flair_css_class ||
					"",
			]
				.map((str) => {
					/**
					 * To escape special characters in the lines (e.g. if the flair text itself contains a comma), surround each
					 * part of the line with double quotes before joining the parts together with commas (in accordance with how special
					 * characters are usually escaped in CSV). If double quotes are themselves part of the flair text, replace them with a
					 * pair of consecutive double quotes.
					 */
					return `"${str.replace(/"/g, '""')}"`;
				})
				.join(",");
		});
		/**
		 * Due to an API limitation, this endpoint can only set the flair of 100 users at a time.
		 * Send multiple requests if necessary to ensure that all users in the array are accounted for.
		 */
		const flairChunks = await Promise.all(
			chunk(csvLines, 100).map((flairChunk) => {
				return this._post({
					url: `r/${this.display_name}/api/flaircsv`,
					form: { flair_csv: flairChunk.join("\n") },
				});
			})
		);
		const results = flatten(flairChunks);
		const errorRows = results.filter((row) => !row.ok);
		if (errorRows.length) {
			throw errorRows;
		}
		return this;
	}

	async _setSubscribed(status) {
		await this._post({
			url: "api/subscribe",
			form: {
				action: status ? "sub" : "unsub",
				sr_name: this.display_name,
			},
		});
		return this;
	}
	public async showMyFlair(): Promise<this> {
		return this._setMyFlairVisibility(true);
	}

	public async submitCrosspost(options) {
		return this._r.submitCrosspost({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitLink(options: SubmitLinkOptions): Promise<Submission> {
		return this._r.submitLink({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitGallery(options) {
		return this._r.submitVideo({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitImage(options) {
		return this._r.submitImage({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitPoll(options) {
		return this._r.submitPoll({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitSelfpost(
		options: SubmitSelfPostOptions
	): Promise<Submission> {
		return this._r.submitSelfpost({
			...options,
			subredditName: this.display_name,
		});
	}
	public async submitVideo(options) {
		return this._r.submitVideo({
			...options,
			subredditName: this.display_name,
		});
	}
	public async subscribe(): Promise<this> {
		return this._setSubscribed(true);
	}
	public async unbanUser(options: { name: string }): Promise<this> {
		return this._unfriend({ name, type: "banned" });
	}
	public async unmuteUser(options: { name: string }): Promise<this> {
		return this._unfriend({ name, type: "muted" });
	}
	public async unsubscribe(): Promise<this> {
		/**
		 * Reddit returns a 404 error if the user attempts to unsubscribe to a subreddit that they weren't subscribed to in the
		 * first place. It also (as one would expect) returns a 404 error if the subreddit in question does not exist. snoowrap
		 * should swallow the first type of error internally, but it should raise the second type of error. Unfortunately, the errors
		 * themselves are indistinguishable. So if a 404 error gets thrown, fetch the current subreddit to check if it exists. If it
		 * does exist, then the 404 error was of the first type, so swallow it and return the current Subreddit object as usual. If
		 * the subreddit doesn't exist, then the original error was of the second type, so throw it.
		 */
		try {
			await this._setSubscribed(false);
		} catch (e) {
			if (e.response.status === 404) {
				return await this.fetch();
			}
			throw e;
		}
		return this;
	}
	public async unwikibanUser({name}: { name: string }): Promise<this> {
		return this._unfriend({ name, type: "wikibanned" });
	}
	public async updateStylesheet({css, reason}: {
		css: string;
		reason?: string;
	}): Promise<this> {
		const res = await this._post({
			url: `r/${this.display_name}/api/subreddit_stylesheet`,
			form: { api_type, op: "save", reason, stylesheet_contents: css },
		});
		handleJsonErrors(res);
		return this;
	}
	public async uploadBannerImage({file, imageType}: ImageUploadOptions): Promise<this> {
		return this._uploadSrImg({ file, imageType, upload_type: "banner" });
	}
	public async uploadHeaderImage({file, imageType}: ImageUploadOptions): Promise<this> {
		return this._uploadSrImg({ file, imageType, uploadType: "header" });
	}
	public async uploadIcon({file, imageType}: ImageUploadOptions): Promise<this> {
		return this._uploadSrImg({ file, imageType, uploadType: "icon" });
	}
	public async uploadStylesheetImage(
		options: ImageUploadOptions & { name: string }
	): Promise<this> {
		return this._uploadSrImg({ name, file, imageType, uploadType: "img" });
	}
	public async wikibanUser(options: { name: string }): Promise<this> {
		return this._friend({ name, type: "wikibanned" });
	}

	async _uploadSrImg({ name, file, uploadType, imageType }) {
		if (typeof file !== "string" && !(file instanceof Readable)) {
			throw new InvalidMethodCallError(
				"Uploaded image filepath must be a string or a ReadableStream."
			);
		}
		const parsedFile =
			typeof file === "string" ? createReadStream(file) : file;
		const result = await this._post({
			url: `r/${this.display_name}/api/upload_sr_img`,
			formData: {
				name,
				upload_type: uploadType,
				img_type: imageType,
				file: parsedFile,
			},
		});
		if (result.errors.length) {
			throw result.errors[0];
		}
		return this;
	}

	async _friend(options) {
		const res = await this._post({
			url: `r/${this.display_name}/api/friend`,
			form: { ...options, api_type },
		});
		handleJsonErrors(res);
		return this;
	}
	async _unfriend(options) {
		const res = await this._post({
			url: `r/${this.display_name}/api/unfriend`,
			form: { ...options, api_type },
		});
		handleJsonErrors(res);
		return this;
	}
}

// this is per-flair
interface FlairParams {
	text: string;
	cssClass?: string;
	textEditable?: boolean;
}

// this is for the entire subreddit
interface FlairConfig {
	userFlairEnabled: boolean;
	userFlairPosition: "left" | "right";
	userFlairSelfAssignEnabled: boolean;
	linkFlairPosition: "left" | "right";
	linkFlairSelfAssignEnabled: boolean;
}

export interface FlairTemplate {
	flair_css_class: string;
	flair_template_id: string;
	flair_text_editable: string;
	flair_position: string;
	flair_text: string;
}

interface UserFlair {
	flair_css_class: string;
	user: string;
	flair_text: string;
}

interface UserDetails {
	date: number;
	name: string;
	id: string;
}
type BannedUser = UserDetails & { note: string };
type MutedUser = UserDetails;
type Contributor = UserDetails;

type SubredditType =
	| "public"
	| "private"
	| "restricted"
	| "gold_restricted"
	| "gold_only"
	| "archived"
	| "employees_only";
type LinkType = "any" | "link" | "self";

type SpamLevel = "low" | "high" | "all";
export interface SubredditSettings {
	name: string;
	title: string;
	public_description: string;
	description: string;
	submit_text?: string;
	hide_ads?: boolean;
	lang?: string;
	type?: SubredditType;
	link_type?: LinkType;
	submit_link_label?: string;
	submit_text_label?: string;
	wikimode?: "modonly" | "anyone" | "disabled";
	wiki_edit_karma?: number;
	wiki_edit_age?: number;
	spam_links?: SpamLevel;
	spam_selfposts?: SpamLevel;
	spam_comments?: SpamLevel;
	over_18?: boolean;
	allow_top?: boolean;
	show_media?: boolean;
	exclude_banned_modqueue?: boolean;
	public_traffic?: boolean;
	collapse_deleted_comments?: boolean;
	suggested_comment_sort?: Sort; // TODO rename AvailableSorts?
	spoilers_enabled?: boolean;
	default_set?: boolean;
}

interface ImageUploadOptions {
	file: string | NodeJS.ReadableStream;
	imageType?: string;
}

interface Rule {
	kind: string;
	short_name: string;
	description: string;
	violation_reason: string;
	created_utc: string;
	priority: number;
	description_html: string;
}

type ModeratorPermission =
	| "wiki"
	| "posts"
	| "access"
	| "mail"
	| "config"
	| "flair";

interface BanOptions {
	name: string;
	banMessage?: string;
	banReason?: string;
	duration?: number;
	banNote?: string;
}

type Timespan = "hour" | "day" | "week" | "month" | "year" | "all";

export type ModActionType =
	| "banuser"
	| "unbanuser"
	| "removelink"
	| "approvelink"
	| "removecomment"
	| "approvecomment"
	| "addmoderator"
	| "invitemoderator"
	| "uninvitemoderator"
	| "acceptmoderatorinvite"
	| "removemoderator"
	| "addcontributor"
	| "removecontributor"
	| "editsettings"
	| "editflair"
	| "distinguish"
	| "marknsfw"
	| "wikibanned"
	| "wikicontributor"
	| "wikiunbanned"
	| "wikipagelisted"
	| "removewikicontributor"
	| "wikirevise"
	| "wikipermlevel"
	| "ignorereports"
	| "unignorereports"
	| "setpermissions"
	| "setsuggestedsort"
	| "sticky"
	| "unsticky"
	| "setcontestmode"
	| "unsetcontestmode"
	| "lock"
	| "unlock"
	| "muteuser"
	| "unmuteuser"
	| "createrule"
	| "editrule"
	| "deleterule"
	| "spoiler"
	| "unspoiler";
