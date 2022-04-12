import snoowrap from "../snoowrap/snoowrap";

export default class UserList {
    constructor (options: any, _r: snoowrap) {
      return options.children.map(user => _r.newObject('RedditUser', user));
    }
}
  