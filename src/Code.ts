const properties = PropertiesService.getScriptProperties();

const CALENDAR_ID = properties.getProperty("CALENDAR_ID");
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");
const WEBHOOK_URL = properties.getProperty("WEBHOOK_URL");

const calendar = CalendarApp.getCalendarById(CALENDAR_ID);

type Opts = { description: string; location: string };
type Calendar = { title: string; dateAry: Date[]; opts: Opts };

function doPost(e) {
  const commandText: string = e.parameter.text
    .replace(/^<(@.*?)> /, "")
    .replace(/<(http.*?)>/, "$1")
    .replace(/<(.*?@google.com)>/, "$1");
  const token: string = e.parameter.token;
  const userId: string = e.parameter.user_id;

  if (token !== VERIFICATION_TOKEN) {
    throw new Error("Invalid token");
  }

  if (/^delete /.test(commandText)) {
    try {
      const eventId = commandText.split(" ")[1].trim();
      deleteEvent(eventId);
      postSlack("イベントが削除されました", false, eventId);
    } catch (e) {
      postSlack(
        `エラーが発生しました :scream:\n${e.message}\n${
          commandText.split(" ")[1]
        }`,
        false
      );
    }
    return;
  }

  try {
    const data: Calendar = parseCommandText(commandText);
    const eventId: string = createCalendar(data);
    postSlack(
      `<@${userId}> がイベントを作成しました:sparkles:\n*${data.title}* に行ってみよう!\n${data.opts.description}`,
      true,
      eventId
    );
  } catch (e) {
    postSlack(`エラーが発生しました :scream:\n${e.message}`, false);
  }
}

function parseCommandText(text) {
  const t = text.split("_");

  if (t.length < 2 || t.length > 5) {
    throw new Error(
      "`@展示郎 展示名_2019/11/9-2019/11/12_新国立美術館_https://example.com`\nのように入力するんやで"
    );
  }
  const [title, dates, ...optAry] = t;

  const dateAry = dates.split("-").map(date => new Date(date));

  if (dateAry.some(date => isNaN(date.getTime()))) {
    throw new Error("日付の形式が正しくないんやで");
  } else if (dateAry.length > 2) {
    throw new Error("3つ以上の日付は指定できないんやで");
  }

  const opts: Opts = { description: "", location: "" };
  optAry.forEach(opt => {
    if (opt.indexOf("http") > -1) {
      opts.description = opt;
    } else {
      opts.location = opt;
    }
  });

  return { title, dateAry, opts };
}

function createCalendar({
  title = "title",
  dateAry = [new Date()],
  opts = { description: "", location: "" }
}: Calendar) {
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
  event.deleteEvent();
}

function postSlack(text, isSuccess, eventId = "") {
  const attachments = [
    {
      color: isSuccess ? "good" : "danger",
      text,
      footer: eventId ? `ID: ${eventId}` : ""
    }
  ];
  const message = {
    username: "展示郎",
    attachments,
    mrkdwn: true
  };
  const opts = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    payload: JSON.stringify(message)
  };
  UrlFetchApp.fetch(WEBHOOK_URL, opts);
}
