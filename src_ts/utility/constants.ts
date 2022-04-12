export const MODULE_NAME = 'snoowrap';
export const VERSION = '2.0.0';
export const DOCS_LINK = 'https://not-an-aardvark.github.io/snoowrap/';
export const API_RULES_LINK = 'https://github.com/reddit/reddit/wiki/API';
export const api_type = 'json';

export const USER_KEYS = new Set(['author', 'approved_by', 'banned_by', 'user']);
export const SUBREDDIT_KEYS = new Set(['subreddit', 'sr']);

export const KINDS = {
    t1: 'Comment',
    t2: 'RedditUser',
    t3: 'Submission',
    t4: 'PrivateMessage',
    t5: 'Subreddit',
    t6: 'Trophy',
    t8: 'PromoCampaign',
    Listing: 'Listing',
    more: 'More',
    UserList: 'UserList',
    KarmaList: 'KarmaList',
    TrophyList: 'TrophyList',
    subreddit_settings: 'SubredditSettings',
    modaction: 'ModAction',
    wikipage: 'WikiPage',
    wikipagesettings: 'WikiPageSettings',
    wikipagelisting: 'WikiPageListing',
    LiveUpdateEvent: 'LiveThread',
    LiveUpdate: 'LiveUpdate',
    LabeledMulti: 'MultiReddit',
    ModmailConversation: 'ModmailConversation',
    ModmailConversationAuthor: 'ModmailConversationAuthor'
};

export const USERNAME_REGEX = /^[\w-]{1,20}$/;
export const SUBMISSION_ID_REGEX = /comments\/(.+?)\//;
export const PLACEHOLDER_REGEX = /{(\w+)}/g;

export const MODERATOR_PERMISSIONS = ['wiki', 'posts', 'access', 'mail', 'config', 'flair'];
export const LIVETHREAD_PERMISSIONS = ['update', 'edit', 'manage'];

export const HTTP_VERBS = ['delete', 'get', 'head', 'patch', 'post', 'put'];
export const IDEMPOTENT_HTTP_VERBS = ['delete', 'get', 'head', 'put'];

export const MAX_TOKEN_LATENCY = 10000;
export const MAX_API_INFO_AMOUNT = 100;
export const MAX_API_MORECHILDREN_AMOUNT = 20;
export const MAX_LISTING_ITEMS = 100;

export const MIME_TYPES = {
    png: 'image/png',
    mov: 'video/quicktime',
    mp4: 'video/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif'
};

export const MEDIA_TYPES = {
    img: 'image',
    video: 'video',
    gif: 'video'
};
