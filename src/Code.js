// const calenderId = "06cjfu4fl3atlsknlkj7ur392g@group.calendar.google.com"; // club-exhibition
const calendarId =
  "kayac.com_rr2pclfu106d2pg20gq1dnh1ic@group.calendar.google.com"; // test用
const calender = CalendarApp.getCalendarById(calendarId);

function doPost(e) {
  const commandText = e.parameter.text;
  const token = e.parameter.token;

  // TODO: tokenでフィルターかける

  const data = parseCommandText(commandText);
  createCalendar(data);

  const res = { text: data.title };
  const text = JSON.stringify(res);
  const mimeType = ContentService.MimeType.JSON;
  return ContentService.createTextOutput(text).setMimeType(mimeType);
}

function parseCommandText(text) {
  const t = text.split(" ");
  // TODO: バリデーション
  [title, date, location, url] = t;
  return { title, date: new Date(date), location, url };
}

function createCalendar({ title, date, location, url }) {
  const title = title || "title";
  const date = date || new Date("2019/11/9");
  const location = location || "国立新美術館";
  const url = url || "";

  calender.createAllDayEvent(title, date, {
    description: url,
    location: location
  });
}
