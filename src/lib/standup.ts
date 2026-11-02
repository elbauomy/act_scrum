/** Leave created by marking someone "off" in the daily standup starts with this text, so it can be found and removed again. */
export const OFF_NOTE = "Off - daily standup";

export const offNote = (reason: string) => (reason.trim() ? `${OFF_NOTE}: ${reason.trim()}` : OFF_NOTE);
export const isStandupLeave = (note: string) => note.startsWith(OFF_NOTE);
