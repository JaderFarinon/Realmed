const { localStart } = require('./physiotherapyRotation');
const clock = minute => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
function groupSessions(snapshots, date) {
  const sessions = [];
  for (const snapshot of snapshots) {
    const rows = snapshot.items || [];
    const minutes = [...new Set([...(snapshot.slots || []), ...rows].map(row => localStart(row.startDate)).filter(start => start?.date === date).map(start => start.minute))].sort((a, b) => a - b);
    const groups = [];
    for (const minute of minutes) {
      const previous = groups[groups.length - 1];
      if (!previous || minute > previous.last + 1) groups.push({ start: minute, last: minute });
      else previous.last = minute;
    }
    groups.forEach((group, index) => {
      const next = groups[index + 1], previous = groups[index - 1];
      const end = next?.start ?? Math.max(group.last + 1, group.start + (previous ? group.start - previous.start : 45));
      const items = rows.filter(row => { const time = localStart(row.startDate); return time?.date === date && time.minute >= group.start && time.minute <= group.last; });
      if (!items.length) return;
      sessions.push({ id: `${snapshot.scheduleId}:${date}:${group.start}`, schedule_id: snapshot.scheduleId, schedule_name: snapshot.scheduleName,
        start_minute: group.start, end_minute: end, start_time: clock(group.start), end_time: clock(end), end_next_day: end >= 1440,
        end_estimated: !next, end_source: next ? 'next_session' : previous ? 'previous_interval' : 'default_45', items });
    });
  }
  sessions.sort((a, b) => a.start_minute - b.start_minute || String(a.schedule_id).localeCompare(String(b.schedule_id)));
  const seen = new Set();
  return sessions.map(session => ({ ...session, items: session.items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }) }))
    .filter(session => session.items.length).map((session, index) => ({ ...session, number: index + 1 }));
}
function serverNow() { return Date.now(); }
function sessionAccess(session, date, now = serverNow()) {
  if (!session || !Number.isFinite(now) || !Number.isInteger(session.start_minute) || !Number.isInteger(session.end_minute)
    || session.start_minute < 0 || session.start_minute >= 1440 || session.end_minute <= session.start_minute || session.end_minute > session.start_minute + 1440) return 'unavailable';
  const local = localStart(new Date(now).toISOString());
  const day = Date.parse(`${date}T00:00:00.000Z`);
  if (!local || !Number.isFinite(day) || new Date(day).toISOString().slice(0,10) !== date) return 'unavailable';
  const minute = (Date.parse(`${local.date}T00:00:00.000Z`) - day) / 60000 + local.minute;
  return minute < session.start_minute ? 'future' : minute >= session.end_minute ? 'past' : 'current';
}
module.exports = { groupSessions, sessionAccess, serverNow };
