const properties = PropertiesService.getScriptProperties();

const CALENDAR_ID = properties.getProperty("CALENDAR_ID");
const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");

type Opts = { description?: string; location?: string };
type Calender = { title: string; dateAry: Date[]; opts: Opts };
type Message = { text: string };

function doPost(e) {
  const commandText: string = e.parameter.text;
  const token: string = e.parameter.token;

  if (token !== VERIFICATION_TOKEN) {
    throw new Error("Invalid token");
  }

  let data: Calender, msg: Message, eventId: string;
  try {
    data = parseCommandText(commandText);
    eventId = createCalendar(data);
    msg = { text: `${data.title} に行ってみよう!\nID: ${eventId}` };
  } catch (e) {
    msg = { text: e.message };
  } finally {
    const text = JSON.stringify(msg);
    const mimeType = ContentService.MimeType.JSON;
    return ContentService.createTextOutput(text).setMimeType(mimeType);
  }
}

function parseCommandText(text) {
  const t = text.split("_");

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
