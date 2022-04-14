import snoowrap from "../snoowrap/snoowrap";

export default class UserList {
    constructor (options: any, _r: snoowrap) {
      return options.children.map((user: any) => _r.newObject('RedditUser', user));
    }
}
  