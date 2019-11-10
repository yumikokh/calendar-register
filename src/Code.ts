const properties = PropertiesService.getScriptProperties();

const CALENDAR_ID = properties.getProperty("CALENDAR_ID");
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");
const OAUTH_ACCESS_TOKEN = properties.getProperty("OAUTH_ACCESS_TOKEN");
const WEBHOOK_URL = properties.getProperty("WEBHOOK_URL");

const calendar = CalendarApp.getCalendarById(CALENDAR_ID);

type Calendar = {
  url: string;
  title: string;
  dateAry: Date[];
  location: string;
};

function doPost(e) {
  const parameter = JSON.parse(e.postData.getDataAsString());

  // Event API verification
  if (parameter.type === "url_verification") {
    return ContentService.createTextOutput(
      JSON.stringify(parameter)
    ).setMimeType(ContentService.MimeType.JSON);
  }
  if (
    parameter.type !== "event_callback" ||
    parameter.token !== VERIFICATION_TOKEN
  )
    throw new Error("403 forbidden.");

  const commandText: string = parameter.event.text
    .replace(/^<(@.*?)> /, "")
    .replace(/<(http.*?)>/, "$1")
    .replace(/<mailto:.*?@google.com\|(.*?@google.com)>/g, "$1");
  const userId: string = parameter.event.user;

  if (/^delete /.test(commandText)) {
    try {
      const eventId = commandText.split(" ")[1].trim();
      const title = deleteEvent(eventId);
      postSlack(`${title}が削除されました`, false, eventId);
    } catch (e) {
      postSlack(`エラーが発生しました :scream:\n${e.message}`, false);
    }
    return;
  }

  try {
    const data: Calendar = parseCommandText(commandText);
    const userName: string = getUserName(userId);
    const createdAt: string = new Date().toDateString();
    const eventId: string = createCalendar(data, userName, createdAt);
    postSlack(
      `<@${userId}> がイベントを作成しました:sparkles:\n*${data.title}* に行ってみよう!\n${data.url}`,
      true,
      eventId
    );
  } catch (e) {
    postSlack(`エラーが発生しました :scream:\n${e.message}`, false);
  }
}

function parseCommandText(text): Calendar {
  const t = text.split("_");

  if (t.length < 2 || t.length > 5) {
    throw new Error(
      "`@展示郎 2019/11/9-2019/11/12_展示名_展示場所_https://example.com`\nのように入力するんやで"
    );
  }
  let [dates, title, location, url] = t;

  if (!/^http/g.test(url)) throw new Error("URLが正しくないで");

  const dateAry = dates.split("-").map((date, i) => {
    if (i > 2) throw new Error("3つ以上の日付は指定できないんやで");
    let d = new Date(date);
    if (isNaN(d.getTime())) new Error("日付の形式が正しくないんやで");
    if (date.split("/").length === 2)
      d = new Date(`${new Date().getFullYear()}/${date}`);
    return d;
  });

  title = Number(title) === 0 ? fetchTitle(url) : title;
  location = Number(location) === 0 ? "" : location;

  return { url, dateAry, title, location };
}

function getUserName(userId): string {
  const res: any = UrlFetchApp.fetch(
    `https://slack.com/api/users.info?token=${OAUTH_ACCESS_TOKEN}&user=${userId}`
  );
  return JSON.parse(res).user.profile.real_name;
}

function fetchTitle(url): string {
  const res = UrlFetchApp.fetch(url);
  const titleRegexp = /<title>([\s\S]*?)<\/title>/i;
  var match = titleRegexp.exec(res.getContentText());
  return match[1];
}

function createCalendar(
  {
    url = "https://",
    dateAry = [new Date()],
    title = "title",
    location = "location"
  }: Calendar,
  userName,
  createdAt
): string {
  const opts = {
    location,
    description: `Created by @${userName}. ${createdAt}\n${url}`
  };
  const event =
    dateAry.length === 1
      ? calendar.createAllDayEvent(title, dateAry[0], opts)
      : dateAry[0].getHours() === 0
      ? calendar.createAllDayEvent(title, dateAry[0], dateAry[1], opts)
      : calendar.createEvent(title, dateAry[0], dateAry[1], opts);
  return event.getId();
}

function deleteEvent(eventId) {
  const event = calendar.getEventById(eventId);
  const title = event.getTitle();
  event.deleteEvent();
  return title;
}

function postSlack(text, isSuccess, eventId = "") {
  const attachments = [
    {
      color: isSuccess ? "good" : "danger",
      text,
      footer: eventId
        ? `ID: <https://calendar.google.com/calendar/embed?src=${CALENDAR_ID}&ctz=Asia%2FTokyo|${eventId}>`
        : ""
    }
  ];
  const message = {
    username: "展示郎",
    attachments,
    mrkdwn: true
  };
  const opts: any = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    payload: JSON.stringify(message)
  };
  UrlFetchApp.fetch(WEBHOOK_URL, opts);
}
