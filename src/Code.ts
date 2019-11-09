const properties = PropertiesService.getScriptProperties();

const CALENDAR_ID = properties.getProperty("CALENDAR_ID");
const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");
const WEBHOOK_URL = properties.getProperty("WEBHOOK_URL");

type Opts = { description?: string; location?: string };
type Calender = { title: string; dateAry: Date[]; opts: Opts };

function doPost(e) {
  const commandText: string = e.parameter.text;
  const token: string = e.parameter.token;
  const userName: string = e.parameter.user_name;

  if (token !== VERIFICATION_TOKEN) {
    throw new Error("Invalid token");
  }

  let data: Calender, eventId: string;
  try {
    data = parseCommandText(commandText);
    eventId = createCalendar(data);
    postSlack(`
      ${userName} がイベントを作成しました ID: ${eventId}
      ${data.title} に行ってみよう!
      ${data.opts.description}
    `);
  } catch (e) {
    postSlack(`
      エラーが発生しました :scream:
      ${e.message}
    `);
  }
}

function parseCommandText(text) {
  const trimedText = text.split(/^<[@A-Z0-9]*> /g)[1];
  const t = trimedText.split("_");

  if (t.length < 2 || t.length > 5) {
    throw new Error(`Invalid argument error. ${text}`);
  }
  const [title, dates, ...optAry] = t;

  const dateAry = dates.split("-").map(date => new Date(date));

  if (dateAry.some(date => isNaN(date.getTime()))) {
    throw new Error(`Invalid Date included. ${text}`);
  } else if (dateAry.length > 2) {
    throw new Error(`Invalid Dates length. ${text}`);
  }

  const opts: Opts = {};
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
  opts = {}
}: Calender) {
  const event =
    dateAry.length === 1
      ? calendar.createAllDayEvent(title, dateAry[0], opts)
      : dateAry[0].getHours() === 0
      ? calendar.createAllDayEvent(title, dateAry[0], dateAry[1], opts)
      : calendar.createEvent(title, dateAry[0], dateAry[1], opts);
  return event.getId();
}

function postSlack(text) {
  const opts = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    payload: '{"text":"' + text + '"}'
  };
  UrlFetchApp.fetch(WEBHOOK_URL, opts);
}
