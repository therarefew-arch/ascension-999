// 🔔 What to tell you while the game is closed: when idling will stop (and why), and when crops are ready.
// Worked out on a copy of your save when you leave the game — the real save is never touched.
import { CROPS } from '../data/tiers';
import { ACTIONS } from '../data/skills';
import { MONSTER_MAP } from '../data/monsters';
import { advanceIdle, runningSlots } from './idle';
import { fightMonster, isFightId } from './combat';
import { clonePlayer, type PlayerState } from './player';
import { offlineCapMs } from './ascension';

export interface Note {
  /** When to send it (ms since 1970). */
  at: number;
  title: string;
  body: string;
  /** Notes with the same tag replace each other on the phone. */
  tag: string;
}

export interface NoteOptions { idle: boolean; farm: boolean }

const what = (actionId: string) =>
  isFightId(actionId) ? `Fighting ${fightMonster(actionId)?.name ?? ''}`.trim() : ACTIONS[actionId]?.name ?? 'Idling';

/** Everything worth a notification in the next 24 hours, if you closed the game right now. */
export function predictNotes(p: PlayerState, now: number, opts: NoteOptions): Note[] {
  const notes: Note[] = [];

  if (opts.idle) {
    const running = runningSlots(p);
    // Mini boss fights pause while you're away anyway — nothing to predict for those.
    const bossFight = p.fight && MONSTER_MAP[p.fight.monsterId]?.miniboss;
    if (running.length && !bossFight && !p.travel) {
      const copy = clonePlayer(p);
      const cap = offlineCapMs(p);
      const report = advanceIdle(copy, cap, now + cap);
      for (const s of report.stops.slice(0, 3)) {
        notes.push({
          at: now + s.afterMs,
          title: s.reason.endsWith('defeated!') ? `🏆 ${s.reason}` : `⏸️ Idle stopped: ${what(s.actionId)}`,
          body: s.reason.endsWith('defeated!') ? 'Come back for your loot!' : `${s.reason}.`,
          tag: `idle-${s.actionId}`,
        });
      }
      // Still going after a full day? Away time only counts up to 24 hours.
      if (report.stops.length < running.length) {
        notes.push({
          at: now + cap,
          title: `⏳ ${Math.round(cap / 3_600_000)} hours of idling done`,
          body: `Time away only counts up to ${Math.round(cap / 3_600_000)} hours — pop back in to keep your progress going.`,
          tag: 'idle-cap',
        });
      }
    }
  }

  if (opts.farm) {
    // One note per moment crops finish (plots ready within the same minute are grouped).
    const ready = p.farm.plots
      .filter((pl): pl is NonNullable<typeof pl> => !!pl && pl.readyAt > now)
      .sort((a, b) => a.readyAt - b.readyAt);
    const groups: { at: number; crops: string[] }[] = [];
    for (const pl of ready) {
      const g = groups.find((x) => Math.abs(x.at - pl.readyAt) < 60_000);
      const name = CROPS[pl.crop].name.toLowerCase();
      if (g) { if (!g.crops.includes(name)) g.crops.push(name); } else groups.push({ at: pl.readyAt, crops: [name] });
    }
    for (const g of groups) {
      const list = g.crops.length > 1 ? `${g.crops.slice(0, -1).join(', ')} and ${g.crops[g.crops.length - 1]}` : g.crops[0];
      notes.push({ at: g.at, title: `🌱 Your ${list} ${g.crops.length > 1 || /s$/.test(list) ? 'are' : 'is'} ready!`, body: 'Harvest your garden (Farming).', tag: `farm-${g.at}` });
    }
  }

  return notes.sort((a, b) => a.at - b.at).slice(0, 12);
}
