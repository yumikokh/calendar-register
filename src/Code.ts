const properties = PropertiesService.getScriptProperties();

const CALENDAR_ID = properties.getProperty("CALENDAR_ID");
const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");
const WEBHOOK_URL = properties.getProperty("WEBHOOK_URL");

type Opts = { description: string; location: string };
type Calender = { title: string; dateAry: Date[]; opts: Opts };

function doPost(e) {
  const commandText: string = e.parameter.text;
  const token: string = e.parameter.token;
  const userId: string = e.parameter.user_id;

  if (token !== VERIFICATION_TOKEN) {
    throw new Error("Invalid token");
  }

  let data: Calender, msg: string, eventId: string;
  try {
    data = parseCommandText(commandText);
    eventId = createCalendar(data);
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
  const trimedText = text.split(/^<[@A-Z0-9]*> /g)[1];
  const t = trimedText.split("_");

  if (t.length < 2 || t.length > 5) {
    throw new Error(
      "@展示郎 展示名_2019/11/9-2019/11/12_新国立美術館_https://example.com\nのように入力するんやで"
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
}: Calender) {
  const event =
    dateAry.length === 1
      ? calendar.createAllDayEvent(title, dateAry[0], opts)
      : dateAry[0].getHours() === 0
      ? calendar.createAllDayEvent(title, dateAry[0], dateAry[1], opts)
      : calendar.createEvent(title, dateAry[0], dateAry[1], opts);
  return event.getId();
}

function postSlack(text, isSuccess, eventId = "") {
  const attachments = [
    {
      color: isSuccess ? "good" : "danger",
      text,
      footer: isSuccess ? `ID: ${eventId}` : ""
    }
  ];
  const message = {
    username: "展示郎",
    attachments,
    markdown_in: ["text"]
  };
  const opts = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    payload: JSON.stringify(message)
  };
  UrlFetchApp.fetch(WEBHOOK_URL, opts);
}
