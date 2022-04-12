import factory from "./factory";
import { snoowrap_options } from "./requestor";
import {addFullnamePrefix} from '../utility/helpers'
export type snoowrap_sortOptions = 'confidence' | 'top' | 'new' | 'controversial' | 'old' | 'random' | 'qa' | 'live'; 

import Trophy from '../interfaces/trophy'
import SubmitLinkOptions from '../interfaces/SubmitLinkOptions'

import { api_type, KINDS, SUBREDDIT_KEYS, USER_KEYS } from "../utility/constants";
import { isBrowser } from "../utility/polyfills";
import { InvalidMethodCallError } from "../utility/errors";

export default interface snoowrap extends factory{
    _ownUserInfo: any; // RedditUser, update when class is created
}

export default class snoowrap extends factory{
    
    constructor(options: snoowrap_options){ super(options) }

    public getUser(name: string): RedditUser{ 
        return this.newObject('RedditUser', {name: (name + '').replace(/^\/?u\//, '')})
    }

    public getComment(commentId: string, submissionId?: string, sort?: snoowrap_sortOptions): Comment{
        return this.newObject('Comment', {
            name: addFullnamePrefix(commentId, 't1_'),
            link_id: submissionId ? addFullnamePrefix(submissionId, 't3_') : null,
            _sort: sort
        });
    }

    public getSubreddit(displayName: string) : Subreddit{ 
        return this.newObject('Subreddit', {display_name: displayName.replace(/^\/?r\//, '')})
    }

    public getSubmission (submissionId: string, sort?: snoowrap_sortOptions) : Submission {
        return this.newObject('Submission', {name: addFullnamePrefix(submissionId, 't3_'), _sort: sort});
    }

    public getMessage (messageId: string) : PrivateMessage{
        return this.newObject('PrivateMessage', {name: addFullnamePrefix(messageId, 't4_')});
    }

    public getLivethread (threadId: string) : LiveThread {
        return this.newObject('LiveThread', {id: addFullnamePrefix(threadId, 'LiveUpdateEvent_').slice(16)});
    }

    public async getMe () : Promise<RedditUser> {
        const result = await this._get({url: 'api/v1/me'});
        this._ownUserInfo = this.newObject('RedditUser', result, true);
        return this._ownUserInfo;
    }

    async #getMyName () : Promise<string>{
        return this._ownUserInfo ? Promise.resolve<string>(this._ownUserInfo.name) : (await this.getMe()).name;
    }

    public getKarma () : Promise<Array<{ sr: Subreddit; comment_karma: number; link_karma: number; }>>{
        return this._get({url: 'api/v1/me/karma'});
    }

    // Needs return type definition!
    public getPreferences () : Promise<any>{
        return this._get({url: 'api/v1/me/prefs'});
    }

    // Needs parameter and return type definition!
    public updatePreferences (updatedPreferences: any) : Promise<void>{
        return this._patch({url: 'api/v1/me/prefs', data: updatedPreferences});
    }

    public getMyTrophies () : Promise<Trophy[]>{
        return this._get({url: 'api/v1/me/trophies'});
    }

    public getFriends () : Promise<RedditUser[]>{
        return this._get({url: 'prefs/friends'});
    }

    public getBlockedUsers () : Promise<RedditUser[]>{
        return this._get({url: 'prefs/blocked'});
    }

    public checkCaptchaRequirement () : Promise<boolean> {
        return this._get({url: 'api/needs_captcha'});
    }

    public async getNewCaptchaIdentifier () : Promise<string>{
        const res = await this._post({url: 'api/new_captcha', form: {api_type}});
        return res.json.data.iden;
    }

    public getCaptchaImage (identifier: string) : Promise<string>{
        return this._get({url: `captcha/${identifier}`});
    }

    // Needs return type definition!
    public async getSavedCategories () : Promise<any[]> {
        const res = await this._get({url: 'api/saved_categories'});
        return res.categories;
    }

    public markAsVisited (links: Submission[]) : Promise<void> {
        return this._post({url: 'api/store_visits', form: {links: links.map(sub => sub.name).join(',')}});
    }

//#region Submit content to Reddit
    async #submit(any: any){} // UPDATE WITH DEFINITION

    public submitLink (options: SubmitLinkOptions) : Promise<Submission>{
        // Todo: Add `options.url` validation.
        return this.#submit({...options, kind: 'link'});
    }


    // Missing type declarations!
    async submitImage ({
        imageFile,
        imageFileName,
        noWebsockets,
        ...options
      }) {
        let url, websocketUrl;
        try {
          const {fileUrl, websocketUrl: wsUrl} = imageFile instanceof MediaImg
            ? imageFile
            : await this.uploadMedia({
              file: imageFile,
              name: imageFileName,
              type: 'img'
            });
          url = fileUrl;
          websocketUrl = wsUrl;
        } catch (err) {
          throw new Error('An error has occurred with the image file: ' + err.message);
        }
        return this.#submit({...options, kind: 'image', url, websocketUrl: noWebsockets ? null : websocketUrl});
    }

    async submitVideo ({
        videoFile,
        videoFileName,
        thumbnailFile,
        thumbnailFileName,
        videogif = false,
        noWebsockets,
        ...options
      }) {
        let url, videoPosterUrl, websocketUrl;
        const kind = videogif ? 'videogif' : 'video';
    
        /**
         * Imagin you just finished uploading a large video, then oops! you faced this error: "An error has occurred with the thumbnail file"!
         * In this case we should validate the thumbnail parameters first to ensure that no accidental uploads will happen.
         */
        if (!(thumbnailFile instanceof MediaImg)) {
          try {
            await this.uploadMedia({
              file: thumbnailFile,
              name: thumbnailFileName,
              type: 'img',
              validateOnly: true
            });
          } catch (err) {
            throw new Error('An error has occurred with the thumbnail file: ' + err.message);
          }
        }
    
        /**
         * Now we are safe to upload. If the provided video is invalid the error can be easly catched.
         */
        try {
          const {fileUrl, websocketUrl: wsUrl} = videoFile instanceof MediaVideo
            ? videoFile
            : await this.uploadMedia({
              file: videoFile,
              name: videoFileName,
              type: videogif ? 'gif' : 'video'
            });
          url = fileUrl;
          websocketUrl = wsUrl;
        } catch (err) {
          throw new Error('An error has occurred with the video file: ' + err.message);
        }
        try {
          const {fileUrl} =
          thumbnailFile instanceof MediaImg
            ? thumbnailFile
            : await this.uploadMedia({
              file: thumbnailFile,
              name: thumbnailFileName,
              type: 'img'
            });
          videoPosterUrl = fileUrl;
        } catch (err) {
          throw new Error('An error occurred with the thumbnail file: ' + err.message);
        }
    
        return this.#submit({...options, kind, url, videoPosterUrl, websocketUrl: noWebsockets ? null : websocketUrl});
      }


      async submitGallery ({gallery, ...options}) {
        /**
         * Validate every single gallery item to ensure that no accidental uploads will happen.
         */
        await Promise.all(gallery.map(async (item, index) => {
          try {
            if (item.caption.length > 180) {
              throw new Error('Caption must be 180 characters or less.');
            }
            // Todo: Add outboundUrl validation.
            if (!(item instanceof MediaImg)) {
              await this.uploadMedia({
                file: item.imageFile,
                name: item.imageFileName,
                type: 'img',
                validateOnly: true
              });
            }
          } catch (err) {
            throw new Error(`An error has occurred with a gallery item at the index ${index}: ` + err.message);
          }
        }));
    
        /**
         * Now we are safe to upload. It still depends on network conditions tho, that's why it is recommended to pass the gallery items
         * as ready-to-use `MediaImg`s instead.
         */
        gallery = await Promise.all(gallery.map(async (item, index) => {
          try {
            if (!(item instanceof MediaImg)) {
              item = await this.uploadMedia({
                file: item.imageFile,
                name: item.imageFileName,
                type: 'img',
                caption: item.caption,
                outboundUrl: item.outboundUrl
              });
            }
          } catch (err) {
            throw new Error(`An error occurred with a gallery item at the index ${index}: ` + err.message);
          }
          return {
            caption: item.caption,
            outbound_url: item.outboundUrl,
            media_id: item.assetId
          };
        }));
    
        return this.#submit({...options, kind: 'gallery', gallery});
      }

      async submitSelfpost ({text, inlineMedia, rtjson, ...options}) {
        /* eslint-disable require-atomic-updates */
        if (rtjson) {
          text = null;
        }
        if (text && inlineMedia) {
          const placeholders = Object.keys(inlineMedia);
    
          // Validate inline media
          await Promise.all(placeholders.map(async p => {
            if (!text.includes(`{${p}}`)) {
              return;
            }
            if (!(inlineMedia[p] instanceof MediaFile)) {
              await this.uploadMedia({
                ...inlineMedia[p],
                validateOnly: true
              });
            }
          }));
    
          // Upload if necessary
          await Promise.all(placeholders.map(async p => {
            if (!text.includes(`{${p}}`)) {
              return;
            }
            if (!(inlineMedia[p] instanceof MediaFile)) {
              inlineMedia[p] = await this.uploadMedia({
                ...inlineMedia[p]
              });
            }
          }));
    
          const body = text.replace(PLACEHOLDER_REGEX, (_m, g1) => inlineMedia[g1]);
          rtjson = await this.convertToFancypants(body);
          text = null;
        }
        return this.#submit({...options, kind: 'self', text, rtjson});
        /* eslint-enable require-atomic-updates */
      }

    submitPoll (options) {
        return this.#submit({...options, kind: 'poll'});
    }

    submitCrosspost ({originalPost, ...options}) {
        return this.#submit({
          ...options,
          kind: 'crosspost',
          crosspostFullname: addFullnamePrefix(originalPost, 't3_')
        });
    }

    async uploadMedia ({file, name, type, caption, outboundUrl, validateOnly = false}) {
        if (isBrowser && typeof fetch === 'undefined') {
          throw new InvalidMethodCallError('Your browser doesn\'t support \'no-cors\' requests');
        }
        if (isBrowser && typeof file === 'string') {
          throw new InvalidMethodCallError('Uploaded file cannot be a string on browser');
        }
        // `File` is a specific kind of `Blob`, so one check for `Blob` is enough
        if (typeof file !== 'string' && !(file instanceof stream.Readable) && !(typeof Blob !== 'undefined' && file instanceof Blob)) {
          throw new InvalidMethodCallError('Uploaded file must either be a string, a ReadableStream, a Blob or a File');
        }
        const parsedFile = typeof file === 'string' ? createReadStream(file) : file;
        const fileName = typeof file === 'string' ? path.basename(file) : file.name || name;
        if (!fileName) {
          requiredArg('name');
        }
        let fileExt = path.extname(fileName) || 'jpeg'; // Default to JPEG
        fileExt = fileExt.replace('.', '');
        const mimetype = typeof Blob !== 'undefined' && file instanceof Blob && file.type ? file.type : MIME_TYPES[fileExt] || '';
        const expectedMimePrefix = MEDIA_TYPES[type];
        if (expectedMimePrefix && mimetype.split('/')[0] !== expectedMimePrefix) {
          throw new errors.InvalidMethodCallError(`Expected a mimetype for the file '${fileName}' starting with '${expectedMimePrefix}' but got '${mimetype}'`);
        }
        // Todo: The file size should be checked
        if (validateOnly) {
          return null;
        }
        const uploadResponse = await this._post({
          url: 'api/media/asset.json',
          form: {
            filepath: fileName,
            mimetype
          }
        });
        const uploadURL = 'https:' + uploadResponse.args.action;
        const fileInfo = {
          fileUrl: uploadURL + '/' + uploadResponse.args.fields.find(item => item.name === 'key').value,
          assetId: uploadResponse.asset.asset_id,
          websocketUrl: uploadResponse.asset.websocket_url,
          caption,
          outboundUrl
        };
        const formdata = new FormData();
        uploadResponse.args.fields.forEach(item => formdata.append(item.name, item.value));
        formdata.append('file', parsedFile, fileName);
        let res;
        if (isBrowser) {
          res = await fetch(uploadURL, {
            method: 'post',
            mode: 'no-cors',
            body: formdata
          });
          this._debug('Response:', res);
          /**
           * Todo: Since the response of 'no-cors' requests cannot contain the status code, the uploaded file should be validated
           * by setting `fileInfo.fileUrl` as the `src` attribute of an img/video element and listening to the load event.
           */
        } else {
          const contentLength = await new Promise((resolve, reject) => {
            formdata.getLength((err, length) => {
              if (err) {
                reject(err);
              }
              resolve(length);
            });
          });
          res = await this.rawRequest({
            url: uploadURL,
            method: 'post',
            headers: {
              'user-agent': this.userAgent,
              'content-type': `multipart/form-data; boundary=${formdata._boundary}`,
              'content-length': contentLength
            },
            data: formdata,
            _r: this
          });
        }
        let media;
        switch (type) {
          case 'img':
            media = new MediaImg(fileInfo);
            break;
          case 'video':
            media = new MediaVideo(fileInfo);
            break;
          case 'gif':
            media = new MediaGif(fileInfo);
            break;
          default:
            media = new MediaFile(fileInfo);
            break;
        }
        return media;
      }

//#endregion

//#region Get listings

    async convertToFancypants (markdown: string) : Promise<string>{
        const response = await this._post({
            uri: 'api/convert_rte_body_format',
            form: {
                output_mode: 'rtjson',
                markdown_text: markdown
            }
        });
        return response.output;
    }

    _getSortedFrontpage (sortType, subredditName, options = {}) {
        // Handle things properly if only a time parameter is provided but not the subreddit name
        let opts = options;
        let subName = subredditName;
        if (typeof subredditName === 'object' && isEmpty(omitBy(opts, option => option === undefined))) {
          /**
           * In this case, "subredditName" ends up referring to the second argument, which is not actually a name since the user
           * decided to omit that parameter.
           */
          opts = subredditName;
          subName = undefined;
        }
        const parsedOptions = omit({...opts, t: opts.time || opts.t}, 'time');
        return this._getListing({uri: (subName ? `r/${subName}/` : '') + sortType, qs: parsedOptions});
      }

      getHot (subredditName, options) {
        return this._getSortedFrontpage('hot', subredditName, options);
      }

      getBest (options) {
        return this._getSortedFrontpage('best', undefined, options);
      }

      getNew (subredditName, options) {
        return this._getSortedFrontpage('new', subredditName, options);
      }

      getNewComments (subredditName, options) {
        return this._getSortedFrontpage('comments', subredditName, options);
      }

      getContentByIds (ids) {
        if (!Array.isArray(ids)) {
          throw new TypeError('Invalid argument: Argument needs to be an array.');
        }
    
        const prefixedIds = ids.map(id => {
          if (id instanceof snoowrap.objects.Submission || id instanceof snoowrap.objects.Comment) {
            return id.name;
          } else if (typeof id === 'string') {
            if (!/t(1|3)_/g.test(ids)) {
              throw new TypeError('Invalid argument: Ids need to include Submission or Comment prefix, e.g. t1_, t3_.');
            }
            return id;
          }
          throw new TypeError('Id must be either a string, Submission, or Comment.');
        });
    
        return this._get({url: '/api/info', params: {id: prefixedIds.join(',')}});
      }

      async getRandomSubmission (subredditName) {
        const res = await this._get({url: `${subredditName ? `r/${subredditName}/` : ''}random`});
        return res instanceof snoowrap.objects.Submission ? res : null;
      }

      getTop (subredditName, options) {
        return this._getSortedFrontpage('top', subredditName, options);
      }

      getControversial (subredditName, options) {
        return this._getSortedFrontpage('controversial', subredditName, options);
      }

      getRising (subredditName, options) {
        return this._getSortedFrontpage('rising', subredditName, options);
      }

//#endregion

//#region inbox stuff

      getUnreadMessages (options = {}) {
        return this._getListing({uri: 'message/unread', qs: options});
      }

      getInbox ({filter, ...options} = {}) {
        return this._getListing({uri: `message/${filter || 'inbox'}`, qs: options});
      }


      getModmail (options = {}) {
        return this._getListing({uri: 'message/moderator', qs: options});
      }

      getNewModmailConversations (options = {}) {
        return this._getListing({
          uri: 'api/mod/conversations', qs: options, _name: 'ModmailConversation', _transform: response => {
            response.after = null;
            response.before = null;
            response.children = [];
    
            for (const conversation of response.conversationIds) {
              response.conversations[conversation].participant = this._newObject('ModmailConversationAuthor', {
                ...response.conversations[conversation].participant
              });
              const conversationObjects = objects.ModmailConversation._getConversationObjects(
                response.conversations[conversation],
                response
              );
              const data = {
                ...conversationObjects,
                ...response.conversations[conversation]
              };
              response.children.push(this._newObject('ModmailConversation', data));
            }
            return this._newObject('Listing', response);
          }
        });
      }

      async createModmailDiscussion ({
        body,
        subject,
        srName
      }) {
        const parsedFromSr = srName.replace(/^\/?r\//, ''); // Convert '/r/subreddit_name' to 'subreddit_name'
        const res = await this._post({
          url: 'api/mod/conversations', form: {
            body, subject, srName: parsedFromSr
          }
        });
        // _newObject ignores most of the response, no practical way to parse the returned content yet
        return this._newObject('ModmailConversation', {id: res.conversation.id});
      }

      getNewModmailConversation (id) {
        return this._newObject('ModmailConversation', {id});
      }

      markNewModmailConversationsAsRead (conversations) {
        const conversationIds = conversations.map(message => addFullnamePrefix(message, ''));
        return this._post({url: 'api/mod/conversations/read', form: {conversationIds: conversationIds.join(',')}});
      }

      markNewModmailConversationsAsUnread (conversations) {
        const conversationIds = conversations.map(message => addFullnamePrefix(message, ''));
        return this._post({url: 'api/mod/conversations/unread', form: {conversationIds: conversationIds.join(',')}});
      }

      async getNewModmailSubreddits () {
        const response = await this._get({url: 'api/mod/conversations/subreddits'});
        return Object.values(response.subreddits).map(s => this._newObject('Subreddit', s));
      }

      getUnreadNewModmailConversationsCount () {
        return this._get({url: 'api/mod/conversations/unread/count'});
      }

      async bulkReadNewModmail (subreddits, state) {
        const subredditNames = subreddits.map(s => typeof s === 'string' ? s.replace(/^\/?r\//, '') : s.display_name);
        const res = await this._post({url: 'api/mod/conversations/bulk/read', form: {
          entity: subredditNames.join(','),
          state
        }});
        return this._newObject('Listing', {
          after: null,
          before: null,
          children: res.conversation_ids.map(id => this._newObject('ModmailConversation', {id}))
        });
      }

      getSentMessages (options = {}) {
        return this._getListing({uri: 'message/sent', qs: options});
      }

      markMessagesAsRead (messages) {
        const messageIds = messages.map(message => addFullnamePrefix(message, 't4_'));
        return this._post({url: 'api/read_message', form: {id: messageIds.join(',')}});
      }

      markMessagesAsUnread (messages) {
        const messageIds = messages.map(message => addFullnamePrefix(message, 't4_'));
        return this._post({url: 'api/unread_message', form: {id: messageIds.join(',')}});
      }

      readAllMessages () {
        return this._post({url: 'api/read_all_messages'});
      }

      async composeMessage ({
        captcha,
        from_subreddit, fromSubreddit = from_subreddit,
        captcha_iden, captchaIden = captcha_iden,
        subject,
        text,
        to
      }) {
        let parsedTo = to;
        let parsedFromSr = fromSubreddit;
        if (to instanceof snoowrap.objects.RedditUser) {
          parsedTo = to.name;
        } else if (to instanceof snoowrap.objects.Subreddit) {
          parsedTo = `/r/${to.display_name}`;
        }
        if (fromSubreddit instanceof snoowrap.objects.Subreddit) {
          parsedFromSr = fromSubreddit.display_name;
        } else if (typeof fromSubreddit === 'string') {
          parsedFromSr = fromSubreddit.replace(/^\/?r\//, ''); // Convert '/r/subreddit_name' to 'subreddit_name'
        }
        const result = await this._post({
          url: 'api/compose', form: {
            api_type, captcha, iden: captchaIden, from_sr: parsedFromSr, subject, text, to: parsedTo
          }
        });
        handleJsonErrors(result);
        return {};
      }

//#endregion

    getOauthScopeList () {
        return this._get({url: 'api/v1/scopes'});
    }

    search (options) {
        if (options.subreddit instanceof snoowrap.objects.Subreddit) {
          options.subreddit = options.subreddit.display_name;
        }
        defaults(options, {restrictSr: true, syntax: 'plain'});
        const parsedQuery = omit(
          {...options, t: options.time, q: options.query, restrict_sr: options.restrictSr},
          ['time', 'query']
        );
        return this._getListing({uri: `${options.subreddit ? `r/${options.subreddit}/` : ''}search`, qs: parsedQuery});
      }

      async searchSubredditNames ({exact = false, include_nsfw = true, includeNsfw = include_nsfw, query}) {
        const res = await this._post({url: 'api/search_reddit_names', params: {exact, include_over_18: includeNsfw, query}});
        return res.names;
      }

      async _createOrEditSubreddit ({
        allow_images = true,
        allow_top = true,
        captcha,
        captcha_iden,
        collapse_deleted_comments = false,
        comment_score_hide_mins = 0,
        description,
        exclude_banned_modqueue = false,
        'header-title': header_title,
        hide_ads = false,
        lang = 'en',
        link_type = 'any',
        name,
        over_18 = false,
        public_description,
        public_traffic = false,
        show_media = false,
        show_media_preview = true,
        spam_comments = 'high',
        spam_links = 'high',
        spam_selfposts = 'high',
        spoilers_enabled = false,
        sr,
        submit_link_label = '',
        submit_text_label = '',
        submit_text = '',
        suggested_comment_sort = 'confidence',
        title,
        type = 'public',
        wiki_edit_age,
        wiki_edit_karma,
        wikimode = 'modonly',
        ...otherKeys
      }) {
        const res = await this._post({
          url: 'api/site_admin', form: {
            allow_images, allow_top, api_type, captcha, collapse_deleted_comments, comment_score_hide_mins, description,
            exclude_banned_modqueue, 'header-title': header_title, hide_ads, iden: captcha_iden, lang, link_type, name,
            over_18, public_description, public_traffic, show_media, show_media_preview, spam_comments, spam_links,
            spam_selfposts, spoilers_enabled, sr, submit_link_label, submit_text, submit_text_label, suggested_comment_sort,
            title, type, wiki_edit_age, wiki_edit_karma, wikimode,
            ...otherKeys
          }
        });
        handleJsonErrors(res);
        return this.getSubreddit(name || sr);
      }

      createSubreddit (options) {
        return this._createOrEditSubreddit(options);
      }

      async searchSubredditTopics ({query}) {
        const results = await this._get({url: 'api/subreddits_by_topic', params: {query}});
        return results.map(result => this.getSubreddit(result.name));
      }

      getSubscriptions (options) {
        return this._getListing({uri: 'subreddits/mine/subscriber', qs: options});
      }

      getContributorSubreddits (options) {
        return this._getListing({uri: 'subreddits/mine/contributor', qs: options});
      }

      getModeratedSubreddits (options) {
        return this._getListing({uri: 'subreddits/mine/moderator', qs: options});
      }

      searchSubreddits (options) {
        options.q = options.query;
        return this._getListing({uri: 'subreddits/search', qs: omit(options, 'query')});
      }

      getPopularSubreddits (options) {
        return this._getListing({uri: 'subreddits/popular', qs: options});
      }

      getNewSubreddits (options) {
        return this._getListing({uri: 'subreddits/new', qs: options});
      }

      getGoldSubreddits (options) {
        return this._getListing({uri: 'subreddits/gold', qs: options});
      }

      getDefaultSubreddits (options) {
        return this._getListing({uri: 'subreddits/default', qs: options});
      }

      checkUsernameAvailability (name) {
        // The oauth endpoint listed in reddit's documentation doesn't actually work, so just send an unauthenticated request.
        return this.unauthenticatedRequest({url: 'api/username_available.json', params: {user: name}});
      }

      async createLivethread ({title, description, resources, nsfw = false}) {
        const result = await this._post({
          url: 'api/live/create',
          form: {api_type, description, nsfw, resources, title}
        });
        handleJsonErrors(result);
        return this.getLivethread(result.json.data.id);
      }

      getStickiedLivethread () {
        return this._get({url: 'api/live/happening_now'});
      }

      getMyMultireddits () {
        return this._get({url: 'api/multi/mine', params: {expand_srs: true}});
      }

      createMultireddit ({
        name, description, subreddits, visibility = 'private', icon_name = '', key_color = '#000000',
        weighting_scheme = 'classic'
      }) {
        return this._post({
          url: 'api/multi', form: {
            model: JSON.stringify({
              display_name: name,
              description_md: description,
              icon_name,
              key_color,
              subreddits: subreddits.map(sub => ({name: typeof sub === 'string' ? sub : sub.display_name})),
              visibility,
              weighting_scheme
            })
          }
        });
      }

      async _selectFlair ({flair_template_id, link, name, text, subredditName}) {
        if (!flair_template_id) {
          throw new errors.InvalidMethodCallError('No flair template ID provided');
        }
        return this._post({url: `r/${subredditName}/api/selectflair`, form: {api_type, flair_template_id, link, name, text}});
      }
    
      async _assignFlair ({css_class, cssClass = css_class, link, name, text, subreddit_name, subredditName = subreddit_name}) {
        return this._post({url: `r/${subredditName}/api/flair`, form: {api_type, name, text, link, css_class: cssClass}});
      }

      
      _populate (responseTree: any, children = {}, nested: boolean) {
        if (typeof responseTree === 'object' && responseTree !== null) {
          // Map {kind: 't2', data: {name: 'some_username', ... }} to a RedditUser (e.g.) with the same properties
          if (Object.keys(responseTree).length === 2 && responseTree.kind && responseTree.data) {
            const populated = this.newObject(KINDS[responseTree.kind] || 'RedditContent', this._populate(responseTree.data, children, true), true);
            if (!nested && Object.keys(children).length) {
              populated._children = children;
            }
            if (populated instanceof Comment) {
              children[populated.id] = populated;
            }
            return populated;
          }
          const result = (Array.isArray(responseTree) ? map : mapValues)(responseTree, (value, key) => {
            // Maps {author: 'some_username'} to {author: RedditUser { name: 'some_username' } }
            if (value !== null && USER_KEYS.has(key)) {
              return this.newObject('RedditUser', {name: value});
            }
            if (value !== null && SUBREDDIT_KEYS.has(key)) {
              return this.newObject('Subreddit', {display_name: value});
            }
            return this._populate(value, children, true);
          });
          if (result.length === 2 && result[0] instanceof Listing
            && result[0][0] instanceof Submission && result[1] instanceof Listing) {
            if (result[1]._more && !result[1]._more.link_id) {
              result[1]._more.link_id = result[0][0].name;
            }
            result[0][0].comments = result[1];
            result[0][0]._children = children;
            return result[0][0];
          }
          if (!nested && Object.keys(children).length) {
            result._children = children;
          }
          return result;
        }
        return responseTree;
      }
    
      _getListing ({uri, qs = {}, ...options}) {
        /**
         * When the response type is expected to be a Listing, add a `count` parameter with a very high number.
         * This ensures that reddit returns a `before` property in the resulting Listing to enable pagination.
         * (Aside from the additional parameter, this function is equivalent to snoowrap.prototype._get)
         */
        const mergedQuery = {count: 9999, ...qs};
        return qs.limit || !isEmpty(options)
          ? this._newObject('Listing', {_query: mergedQuery, _uri: uri, ...options}).fetchMore(qs.limit || MAX_LISTING_ITEMS)
          /**
           * This second case is used as a fallback in case the endpoint unexpectedly ends up returning something other than a
           * Listing (e.g. Submission#getRelated, which used to return a Listing but no longer does due to upstream reddit API
           * changes), in which case using fetch_more() as above will throw an error.
           *
           * This fallback only works if there are no other meta-properties provided for the Listing, such as _transform. If there are
           * other meta-properties,  the function will still end up throwing an error, but there's not really any good way to handle it
           * (predicting upstream changes can only go so far). More importantly, in the limited cases where it's used, the fallback
           * should have no effect on the returned results
           */
          : this._get({url: uri, params: mergedQuery}).then(listing => {
            if (Array.isArray(listing)) {
              listing.filter(item => item.constructor._name === 'Comment').forEach(addEmptyRepliesListing);
            }
            return listing;
          });
      }
    


}