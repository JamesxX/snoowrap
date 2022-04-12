export default interface SubmitLinkOptions {
    subredditName: string;
    title: string;
    url: string;
    sendReplies?: boolean;
    resubmit?: boolean;
    captchaIden?: string;
    captchaResponse?: string;
    nsfw?: boolean;
    spoiler?: boolean;
    flairId?: string;
    flairText?: string;
}