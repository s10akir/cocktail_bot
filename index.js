'use strict';


require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { RTMClient } = require('@slack/rtm-api');

const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;


const web = new WebClient(SLACK_TOKEN);
const rtm = new RTMClient(SLACK_BOT_TOKEN);


/**
 * 分報を一つのチャンネルにまとめる
 * @params event RTMのイベント
 */
const mergeDiary = async event => {
  // テキストの含まれない投稿とスレッドは無視
  if (!event.text || event.thread_ts) return;

  const res = await web.users.info({
    user: event.user,
  });
  const user = res.user;

  // 人によってはdisplay_nameを設定していないのでその場合はreal_nameとする
  const username = user.profile.display_name ? user.profile.display_name : user.profile.real_name;
  const icon_url = user.profile.image_48;

 //チャットへのリンクを取得
  const relink = await web.chat.getPermalink({
    channel : event.channel,
    message_ts : event.ts
  });
  const permalink = relink.permalink;

  const attachments = createAttachments(username,permalink,event.text);

  await web.chat.postMessage({
    channel: 'times_all',
    // TODO: event.textだけでは情報が足りないのでそのうちなんとかする
    // e.g. 画像やスタンプなど
    username,
    icon_url,
    attachments,
    unfurl_links: true
  });
};


// このBotが参加しているチャンネルの全メッセージイベントを受け取る
rtm.on('message', event => {
  console.log(event);

  (async () => {
    const res = await web.channels.info({
      channel: event.channel,
    });

    const channel = res.channel;

    // times_で始まるチャンネルでの発言をmergeDiaryへ投げる
    const times_regex = /^times_(?!all)/;
     if (channel.name.match(times_regex)) {
       mergeDiary(event);
     }
  })();
});

(async () => {
  await rtm.start();
})();

function createAttachments(username,permalink,message){
  return [
    {
      "pretext": "<" + permalink + "|" + username + "さんのチャンネルへ飛ぶ！>",
      "text": message
    }
 ]
};