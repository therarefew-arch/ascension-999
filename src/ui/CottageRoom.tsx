// 🏠 The Cottage room you arrange (v0.0.2.2, owner: "update cottage to be able to customize and arrange the items").
// A top-down pixel room (ui/cottageArt.ts): tap a piece to see what it does; ✏️ Arrange to drag pieces around, flip
// them or put them away (their perk still counts); 🎨 to pick the wallpaper and floor. Rules + saving: core/cottage.ts.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { clampSpot, FLOORS, FURNITURE_MAP, perkText, ROOM, shapeOf, WALLS, type FloorId, type Spot, type WallId } from '../core/cottage';
import { game, useGame } from '../core/store';
import { PET_MAP } from '../data/pets';
import { drawPiece, drawRoom, FLOOR_SWATCH, LIGHTS, wallSwatch } from './cottageArt';
import { useDayPhase } from './PixelScene';

const SKY: Record<string, string> = { dawn: '#f6c7a1', day: '#93d0ec', dusk: '#f4a460', night: '#1c2238' };

export function CottageRoom() {
  const { player } = useGame();
  const phase = useDayPhase();
  const [arrange, setArrange] = useState(false);
  const [paint, setPaint] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null);
  const live = useRef({ player, sel, phase, arrange });
  live.current = { player, sel, phase, arrange };

  // New pieces (and older saves) get a place in the room.
  useEffect(() => { game.cottageAutoPlace(); }, [player.cottage.length]);

  // While arranging, a drag moves furniture instead of scrolling the page (iPhone ignores touch-action).
  useEffect(() => {
    const el = canvas.current;
    if (!el || !arrange) return;
    const stop = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, [arrange]);

  // Draw (animated: the fire flickers, the fish swim, your pet wanders about).
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const c = canvas.current;
      if (c) {
        const g = c.getContext('2d')!;
        const { player: p, sel: s, phase: ph, arrange: ar } = live.current;
        const style = p.cottageStyle ?? { wall: 'cream', floor: 'oak' };
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.imageSmoothingEnabled = false;
        drawRoom(g, style.wall, style.floor);
        const pieces = placedPieces(p, drag.current);
        for (const pc of pieces) {
          g.save();
          g.translate(pc.x, pc.y);
          if (pc.f) { g.translate(pc.w, 0); g.scale(-1, 1); }
          if (drag.current?.id === pc.id) g.globalAlpha = 0.85;
          drawPiece(g, pc.id, t, SKY[ph]);
          g.restore();
        }
        // Your pet strolls along the floor
        const pet = p.activePet ? PET_MAP[p.activePet] : undefined;
        if (pet) {
          const span = ROOM.w - 60;
          const k = (t / 14000) % 2;
          const px = 30 + (k < 1 ? k : 2 - k) * span;
          g.save();
          g.font = '13px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
          g.textAlign = 'center';
          g.translate(px, ROOM.floorBottom - 26 + (Math.floor(t / 250) % 2));
          if (k < 1) g.scale(-1, 1);
          g.fillText(pet.emoji, 0, 0);
          g.restore();
        }
        // Dusk and night: the room dims and the lamps glow
        if (ph === 'night' || ph === 'dusk') {
          g.fillStyle = ph === 'night' ? 'rgba(20,24,58,0.42)' : 'rgba(255,140,60,0.10)';
          g.fillRect(ROOM.side, ROOM.wallTop, ROOM.w - ROOM.side * 2, ROOM.floorBottom - ROOM.wallTop);
          g.globalCompositeOperation = 'lighter';
          for (const pc of pieces) {
            const L = LIGHTS[pc.id];
            if (!L) continue;
            const lx = pc.x + (pc.f ? pc.w - L[0] : L[0]), ly = pc.y + L[1];
            const grad = g.createRadialGradient(lx, ly, 1, lx, ly, L[2] * (1 + 0.04 * Math.sin(t / 200)));
            grad.addColorStop(0, `rgba(${L[3]},${ph === 'night' ? 0.55 : 0.25})`);
            grad.addColorStop(1, `rgba(${L[3]},0)`);
            g.fillStyle = grad;
            g.fillRect(lx - L[2], ly - L[2], L[2] * 2, L[2] * 2);
          }
          g.globalCompositeOperation = 'source-over';
        }
        // The chosen piece
        const chosen = pieces.find((pc) => pc.id === s);
        if (chosen) {
          g.strokeStyle = ar ? '#fde047' : 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.lineDashOffset = -t / 80;
          g.strokeRect(chosen.x - 1.5, chosen.y - 1.5, chosen.w + 3, chosen.h + 3);
          g.setLineDash([]);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toRoom = (e: React.PointerEvent) => {
    const b = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - b.left) * ROOM.w) / b.width, y: ((e.clientY - b.top) * ROOM.h) / b.height };
  };
  const hit = (x: number, y: number) => [...placedPieces(player, null)].reverse().find((pc) => x >= pc.x - 2 && x <= pc.x + pc.w + 2 && y >= pc.y - 2 && y <= pc.y + pc.h + 2);
  const down = (e: React.PointerEvent) => {
    const at = toRoom(e);
    const pc = hit(at.x, at.y);
    if (!pc) { setSel(null); return; }
    setSel(pc.id);
    sound.play('tick', { rate: 1.2, volume: 0.4 });
    if (!arrange) return;
    e.preventDefault();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* fine */ }
    drag.current = { id: pc.id, dx: at.x - pc.x, dy: at.y - pc.y, x: pc.x, y: pc.y, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const at = toRoom(e);
    const c = clampSpot(d.id, at.x - d.dx, at.y - d.dy);
    if (c.x !== d.x || c.y !== d.y) { d.x = c.x; d.y = c.y; d.moved = true; }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) { game.cottageMove(d.id, d.x, d.y); sound.play('thud', { volume: 0.5, rate: 1.1 }); }
  };

  const f = sel ? FURNITURE_MAP[sel] : undefined;
  const stored = player.cottage.filter((id) => player.cottageLayout?.[id] === 0 && FURNITURE_MAP[id]);
  const style = player.cottageStyle ?? { wall: 'cream' as WallId, floor: 'oak' as FloorId };
  return (
    <div className="ct-wrap">
      <canvas ref={canvas} width={ROOM.w} height={ROOM.h} className={`ct-room ${arrange ? 'edit' : ''}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {!player.cottage.length && <p className="small muted center">An empty room, full of possibilities. Build your first piece below!</p>}
      <div className="ct-tools">
        <button className={`btn btn-sm ${arrange ? 'btn-primary' : ''}`} onClick={() => { sound.play('click'); setArrange(!arrange); setPaint(false); }}>{arrange ? '✅ Done' : '✏️ Arrange'}</button>
        <button className={`btn btn-sm ${paint ? 'btn-primary' : ''}`} onClick={() => { sound.play('click'); setPaint(!paint); }}>🎨 Walls & floor</button>
      </div>
      {arrange && !sel && <p className="tiny muted center">Drag a piece to move it. Tap one to flip it or put it away.</p>}
      {f && (
        <div className="ct-info">
          <span className="ct-emoji">{f.emoji}</span>
          <span className="grow"><b>{f.name}</b><span className="small gold">{perkText(f.perk)}</span><span className="tiny muted">{f.blurb}</span></span>
          {arrange && (
            <span className="ct-btns">
              <button className="btn btn-sm" onClick={() => { sound.play('whoosh', { volume: 0.4 }); game.cottageFlip(f.id); }}>↔️ Flip</button>
              <button className="btn btn-sm" onClick={() => { sound.play('click'); game.cottageStore(f.id); setSel(null); }}>📦 Put away</button>
            </span>
          )}
        </div>
      )}
      {arrange && stored.length > 0 && (
        <div className="ct-store">
          <span className="tiny muted">📦 Put away — tap to bring one back into the room (their perks always count):</span>
          <div className="ct-chips">{stored.map((id) => <button key={id} className="btn btn-sm" onClick={() => { sound.play('thud', { volume: 0.5 }); game.cottagePlace(id); setSel(id); }}>{FURNITURE_MAP[id].emoji} {FURNITURE_MAP[id].name}</button>)}</div>
        </div>
      )}
      {paint && (
        <div className="ct-paint">
          <span className="tiny muted">Wallpaper</span>
          <div className="ct-swatches">{WALLS.map((w) => <button key={w.id} className={`ct-sw ${style.wall === w.id ? 'on' : ''}`} style={{ background: wallSwatch(w.id) }} title={w.name} aria-label={w.name} onClick={() => { sound.play('tick'); game.cottageSetStyle(w.id, style.floor); }} />)}</div>
          <span className="tiny muted">Floor</span>
          <div className="ct-swatches">{FLOORS.map((fl) => <button key={fl.id} className={`ct-sw ${style.floor === fl.id ? 'on' : ''}`} style={{ background: FLOOR_SWATCH[fl.id] }} title={fl.name} aria-label={fl.name} onClick={() => { sound.play('tick'); game.cottageSetStyle(style.wall, fl.id); }} />)}</div>
        </div>
      )}
    </div>
  );
}

interface Placed { id: string; x: number; y: number; w: number; h: number; f?: 1; order: number }
/** The pieces in the room, in drawing order: rugs, then what hangs on the wall, then what stands (back to front). */
function placedPieces(p: { cottage: string[]; cottageLayout?: Record<string, Spot | 0> }, drag: { id: string; x: number; y: number } | null): Placed[] {
  const out: Placed[] = [];
  for (const id of p.cottage) {
    const sp = p.cottageLayout?.[id];
    if (!sp || !FURNITURE_MAP[id]) continue;
    const s = shapeOf(id);
    const x = drag?.id === id ? drag.x : sp.x, y = drag?.id === id ? drag.y : sp.y;
    out.push({ id, x, y, w: s.w, h: s.h, f: sp.f, order: s.flat ? y : s.wall ? 1000 + y : 2000 + y + s.h });
  }
  return out.sort((a, b) => a.order - b.order);
}
