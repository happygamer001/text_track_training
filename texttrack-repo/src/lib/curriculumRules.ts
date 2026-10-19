// What stops a track or topic from being deleted. Pure so it can be tested;
// the API routes fetch the counts and call these.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function trackDeleteBlockers(c: { employees: number; progress: number; assets: number }): string[] {
  const out: string[] = [];
  if (c.employees > 0)
    out.push(`${plural(c.employees, "person is", "people are")} assigned to this track. Move them to another track first.`);
  if (c.progress > 0)
    out.push(`${plural(c.progress, "progress record exists", "progress records exist")} for its topics.`);
  if (c.assets > 0)
    out.push(`${plural(c.assets, "video/handout is", "videos/handouts are")} attached to its topics. Remove them in the Content Manager first.`);
  return out;
}

export function topicDeleteBlockers(
  weekNumber: number,
  c: { onThisWeek: number; progress: number; assets: number }
): string[] {
  const out: string[] = [];
  if (c.onThisWeek > 0)
    out.push(`${plural(c.onThisWeek, "person is", "people are")} on week ${weekNumber} right now; deleting it would leave them without a lesson.`);
  if (c.progress > 0)
    out.push(`${plural(c.progress, "progress record exists", "progress records exist")} for this topic.`);
  if (c.assets > 0)
    out.push(`${plural(c.assets, "video/handout is", "videos/handouts are")} attached. Remove them in the Content Manager first.`);
  return out;
}
