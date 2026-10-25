// 🔍 Lunaria's mystery card on the Town screen: "The Silent Bell".
import { getItem } from '../data/items';
import { CLUE_IDS, LANTERN_COST, LANTERN_LEVEL, LANTERNS, questState, whyCantLight, whyCantRing } from '../core/lunaria';
import { countInBag } from '../core/inventory';
import { game, useGame } from '../core/store';

function Step({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <div className={`sb-step ${done ? 'done' : ''}`}>
      <span className="sb-check">{done ? '✓' : '·'}</span>
      <div className="grow">
        <div className="sb-label">{label}</div>
        {detail && <div className="small muted">{detail}</div>}
      </div>
    </div>
  );
}

export function SilentBell({ onJournal, onCombat }: { onJournal: () => void; onCombat: () => void }) {
  const { player } = useGame();
  const q = questState(player);

  if (q.restored) {
    return (
      <section className="sb-card restored">
        <div className="row-between"><h2 className="section-title">🔔 THE SILENT BELL</h2><span className="chip up">Solved</span></div>
        <p className="small">The lanterns burn, the bell rings warm, and Lunaria is home. Lune waves from the bell tower every time you arrive.</p>
        <button className="btn btn-wide" onClick={onJournal}>📜 Read the tale again</button>
      </section>
    );
  }

  const lightWhy = whyCantLight(player);
  const ringWhy = whyCantRing(player);
  return (
    <section className="sb-card">
      <h2 className="section-title">🔍 THE SILENT BELL</h2>
      <p className="small muted">Every lantern went dark at once. The townsfolk are still here — just out of reach. Find out what happened, and bring them home.</p>
      <div className="sb-steps">
        <Step done={q.arrived} label="Arrive in Lunaria" />
        <Step done={q.clues >= CLUE_IDS.length} label={`Find Lune's clues (${q.clues}/${CLUE_IDS.length})`} detail="Turn up by chance while skilling on the island" />
        <Step done={q.hushDefeated} label="Defeat The Hush" detail={q.hushDefeated ? undefined : 'It lurks in The Fog Streets (Combat)'} />
        <Step done={q.lanterns >= LANTERNS} label={`Relight the Moonlanterns (${q.lanterns}/${LANTERNS})`}
          detail={`Each: ${LANTERN_COST.map((c) => `${c.qty} ${getItem(c.id).name}`).join(' + ')} · Firemaking ${LANTERN_LEVEL}`} />
        <Step done={false} label="Ring the bell" detail={q.hasKey ? 'You have the bell tower key 🔑' : "The tower is locked — the key is somewhere in Bluecliff"} />
      </div>
      <div className="sb-lanterns" aria-label={`${q.lanterns} of ${LANTERNS} lanterns lit`}>
        {Array.from({ length: LANTERNS }, (_, i) => <span key={i} className={i < q.lanterns ? 'lit' : ''}>🏮</span>)}
      </div>
      <div className="btn-pair">
        {!q.hushDefeated
          ? <button className="btn btn-lg" onClick={onCombat}>⚔ Face The Hush</button>
          : <button className="btn btn-fire btn-lg" disabled={!!lightWhy} onClick={() => game.lightLantern()} title={lightWhy ?? undefined}>
              🕯️ Light a lantern
              <small className="sb-have">{LANTERN_COST.map((c) => `${countInBag(player.inventory, c.id)}/${c.qty}`).join(' · ')}</small>
            </button>}
        <button className="btn btn-hero btn-lg" disabled={!!ringWhy} onClick={() => game.ringBell()}>🔔 Ring the bell</button>
      </div>
      {(lightWhy && q.hushDefeated && q.lanterns < LANTERNS) && <p className="small muted center">{lightWhy}</p>}
      {(!lightWhy || q.lanterns >= LANTERNS) && ringWhy && <p className="small muted center">{ringWhy}</p>}
      <button className="btn btn-wide" onClick={onJournal}>📜 Clues so far (Journal → Tales)</button>
    </section>
  );
}
