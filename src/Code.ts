// const calenderId = "06cjfu4fl3atlsknlkj7ur392g@group.calendar.google.com"; // club-exhibition
const calendarId =
  "kayac.com_rr2pclfu106d2pg20gq1dnh1ic@group.calendar.google.com"; // test用
const calendar = CalendarApp.getCalendarById(calendarId);

type Opts = { description?: string; location?: string };
type Calender = { title: string; dateAry: Date[]; opts: Opts };
type Message = { text: string };

function doPost(e) {
  const commandText: string = e.parameter.text;
  const token: string = e.parameter.token;

  // TODO: tokenでフィルターかける

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

  if (dateAry.some(date => !date.getDay())) {
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
  if (dateAry.length === 2) {
    return calendar.createEvent(title, dateAry[0], dateAry[1], opts).getId();
  } else {
    return calendar.createAllDayEvent(title, dateAry[0], opts).getId();
  }
}
