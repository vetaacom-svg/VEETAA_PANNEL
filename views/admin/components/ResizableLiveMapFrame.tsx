import React, {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useLayoutEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { GripHorizontal } from 'lucide-react';

const TECH_MAX_UNBOUNDED_PX = 50_000;
const DEFAULT_VIEWPORT_MAX_RATIO = 0.96;
const AUTO_SCROLL_MS = 36;
const AUTO_SCROLL_STEP_PX = 22;
const EDGE_ZONE_PX = 52;

export type LiveMapFrameContextValue = {
   heightPx: number;
   /** Incrémenté à chaque changement de hauteur du cadre (invalidateSize carte). */
   resizeToken: number;
};

const LiveMapFrameHeightContext = createContext<LiveMapFrameContextValue | null>(null);

export function useLiveMapFrameContext(): LiveMapFrameContextValue | null {
   return useContext(LiveMapFrameHeightContext);
}

function findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
   let el: HTMLElement | null = start?.parentElement ?? null;
   while (el && el !== document.body) {
      const st = window.getComputedStyle(el);
      const oy = st.overflowY;
      if (oy === 'auto' || oy === 'scroll') return el;
      el = el.parentElement;
   }
   return null;
}

function readStoredHeight(key: string): number | null {
   try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
   } catch {
      return null;
   }
}

function writeStoredHeight(key: string, h: number) {
   try {
      localStorage.setItem(key, String(Math.round(h)));
   } catch {
      /* ignore */
   }
}

export type ResizableLiveMapFrameProps = {
   top: React.ReactNode;
   /** Soit un nœud, soit une fonction recevant le contexte (resizeToken, heightPx). */
   map: React.ReactNode | ((ctx: LiveMapFrameContextValue) => React.ReactNode);
   bottom: React.ReactNode;
   defaultHeightPx: number;
   minHeightPx: number;
   /** Si défini et unboundedVerticalResize false, plafond en px. Sinon 96vh équivalent via maxHeightPx calculé. */
   maxHeightPx?: number;
   /** true = plafond technique très haut (50 000 px). false = limiter au viewport (~96%). */
   unboundedVerticalResize?: boolean;
   storageKey: string;
   gripLabel?: string;
   showBottomResizeGrip?: boolean;
   showBottomExpandControls?: boolean;
   bottomGripTitle?: string;
   bottomGripHint?: string;
   /** max-height CSS pour la zone légende (scroll interne) afin de garder la 2ᵉ poignée visible. */
   bottomContentMaxHeight?: string;
   autoScrollWhileResizeDrag?: boolean;
   className?: string;
};

/**
 * Grand cadre « Carte live » : hauteur totale en px, deux poignées TIRER (carte/légende + bas),
 * légende en zone scrollable bornée, persistance localStorage, option auto-scroll au drag.
 */
export const ResizableLiveMapFrame: React.FC<ResizableLiveMapFrameProps> = ({
   top,
   map,
   bottom,
   defaultHeightPx,
   minHeightPx,
   maxHeightPx: maxHeightPxProp,
   unboundedVerticalResize = true,
   storageKey,
   gripLabel = 'TIRER',
   showBottomResizeGrip = true,
   showBottomExpandControls = false,
   bottomGripTitle,
   bottomGripHint,
   bottomContentMaxHeight = 'min(42dvh, 380px)',
   autoScrollWhileResizeDrag = true,
   className = '',
}) => {
   const maxHeightPx = useMemo(() => {
      if (unboundedVerticalResize) return TECH_MAX_UNBOUNDED_PX;
      if (typeof maxHeightPxProp === 'number' && Number.isFinite(maxHeightPxProp)) return maxHeightPxProp;
      if (typeof window === 'undefined') return 2000;
      return Math.round(window.innerHeight * DEFAULT_VIEWPORT_MAX_RATIO);
   }, [unboundedVerticalResize, maxHeightPxProp]);

   const [heightPx, setHeightPxState] = useState(() => {
      const stored = readStoredHeight(storageKey);
      const base = stored ?? defaultHeightPx;
      return Math.min(maxHeightPx, Math.max(minHeightPx, base));
   });

   const [resizeToken, setResizeToken] = useState(0);

   useLayoutEffect(() => {
      setHeightPxState(h => Math.min(maxHeightPx, Math.max(minHeightPx, h)));
   }, [minHeightPx, maxHeightPx]);

   const setHeightPx = useCallback(
      (updater: number | ((prev: number) => number)) => {
         setHeightPxState(prev => {
            const next = typeof updater === 'function' ? (updater as (p: number) => number)(prev) : updater;
            return Math.min(maxHeightPx, Math.max(minHeightPx, next));
         });
      },
      [minHeightPx, maxHeightPx]
   );

   useEffect(() => {
      setResizeToken(t => t + 1);
   }, [heightPx]);

   useEffect(() => {
      writeStoredHeight(storageKey, heightPx);
   }, [storageKey, heightPx]);

   const ctxValue = useMemo<LiveMapFrameContextValue>(
      () => ({ heightPx, resizeToken }),
      [heightPx, resizeToken]
   );

   const mapNode = useMemo(() => {
      return typeof map === 'function' ? (map as (c: LiveMapFrameContextValue) => React.ReactNode)(ctxValue) : map;
   }, [map, ctxValue]);

   const gripRef = useRef<HTMLDivElement | null>(null);
   const bottomGripRef = useRef<HTMLDivElement | null>(null);
   const lastClientYRef = useRef(0);
   const pointerClientYRef = useRef(0);
   const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const maxHeightPxRef = useRef(maxHeightPx);
   const minHeightPxRef = useRef(minHeightPx);
   maxHeightPxRef.current = maxHeightPx;
   minHeightPxRef.current = minHeightPx;

   const clearAutoScroll = useCallback(() => {
      if (autoScrollTimerRef.current) {
         clearInterval(autoScrollTimerRef.current);
         autoScrollTimerRef.current = null;
      }
   }, []);

   const startPointerResize = useCallback(
      (gripEl: HTMLElement) => (e: React.PointerEvent) => {
         e.preventDefault();
         e.stopPropagation();
         gripEl.setPointerCapture(e.pointerId);
         lastClientYRef.current = e.clientY;
         pointerClientYRef.current = e.clientY;

         const scrollRoot = findScrollableAncestor(gripEl);

         const onMove = (ev: PointerEvent) => {
            const dy = ev.clientY - lastClientYRef.current;
            lastClientYRef.current = ev.clientY;
            pointerClientYRef.current = ev.clientY;
            setHeightPx(h => h + dy);

            if (autoScrollWhileResizeDrag && typeof window !== 'undefined') {
               const y = ev.clientY;
               const nearBottom = y > window.innerHeight - EDGE_ZONE_PX;
               const nearTop = y < EDGE_ZONE_PX;
               if (nearBottom || nearTop) {
                  if (!autoScrollTimerRef.current) {
                     autoScrollTimerRef.current = setInterval(() => {
                        const py = pointerClientYRef.current;
                        const nb = py > window.innerHeight - EDGE_ZONE_PX;
                        const nt = py < EDGE_ZONE_PX;
                        const maxH = maxHeightPxRef.current;
                        const minH = minHeightPxRef.current;
                        if (nb) {
                           setHeightPx(h => Math.min(maxH, h + AUTO_SCROLL_STEP_PX));
                           window.scrollBy({ top: AUTO_SCROLL_STEP_PX, behavior: 'auto' });
                           if (scrollRoot) scrollRoot.scrollTop += AUTO_SCROLL_STEP_PX;
                        } else if (nt) {
                           setHeightPx(h => Math.max(minH, h - AUTO_SCROLL_STEP_PX));
                           window.scrollBy({ top: -AUTO_SCROLL_STEP_PX, behavior: 'auto' });
                           if (scrollRoot) scrollRoot.scrollTop -= AUTO_SCROLL_STEP_PX;
                        }
                     }, AUTO_SCROLL_MS);
                  }
               } else {
                  clearAutoScroll();
               }
            }
         };

         const onUp = (ev: PointerEvent) => {
            try {
               gripEl.releasePointerCapture(ev.pointerId);
            } catch {
               /* ignore */
            }
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            clearAutoScroll();
         };

         document.addEventListener('pointermove', onMove);
         document.addEventListener('pointerup', onUp);
         document.addEventListener('pointercancel', onUp);
      },
      [autoScrollWhileResizeDrag, clearAutoScroll, setHeightPx]
   );

   const onMiddleGripPointerDown = useCallback(
      (e: React.PointerEvent) => {
         const el = gripRef.current;
         if (el) startPointerResize(el)(e);
      },
      [startPointerResize]
   );

   const onBottomGripPointerDown = useCallback(
      (e: React.PointerEvent) => {
         const el = bottomGripRef.current;
         if (el) startPointerResize(el)(e);
      },
      [startPointerResize]
   );

   const applyQuickExpand = useCallback(
      (delta: number) => {
         setHeightPx(h => Math.min(maxHeightPx, h + delta));
      },
      [maxHeightPx, setHeightPx]
   );

   const expand2xViewport = useCallback(() => {
      if (typeof window === 'undefined') return;
      setHeightPx(h => Math.min(maxHeightPx, Math.max(h, window.innerHeight * 2)));
   }, [maxHeightPx, setHeightPx]);

   const rootStyle: React.CSSProperties = {
      height: heightPx,
      minHeight: minHeightPx,
      maxHeight: unboundedVerticalResize ? undefined : maxHeightPx,
      boxSizing: 'border-box',
   };

   const gripClass =
      'shrink-0 h-7 flex flex-col items-center justify-center cursor-row-resize bg-slate-100 hover:bg-orange-50/90 border-y border-slate-200 select-none group z-[1002] touch-none';

   return (
      <LiveMapFrameHeightContext.Provider value={ctxValue}>
         <div
            className={`flex w-full min-w-0 min-h-0 flex-col overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-xl ${className}`}
            style={rootStyle}
            data-live-map-frame
         >
            <div className="shrink-0">{top}</div>

            <div className="relative min-h-[120px] min-w-0 flex-1 overflow-hidden">
               {mapNode}
            </div>

            <div
               ref={gripRef}
               role="separator"
               aria-orientation="horizontal"
               aria-label="Redimensionner le cadre entre la carte et la légende"
               data-resize-grip="map-legend"
               onPointerDown={onMiddleGripPointerDown}
               className={gripClass}
            >
               <GripHorizontal size={18} className="text-slate-400 group-hover:text-orange-500" strokeWidth={2.5} />
               <span className="mt-0.5 text-[7px] font-black uppercase leading-none tracking-wide text-slate-400 group-hover:text-orange-600">
                  {gripLabel}
               </span>
            </div>

            <div className="flex min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-slate-100 bg-white">
               <div
                  className="min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden"
                  style={{ maxHeight: bottomContentMaxHeight }}
               >
                  {bottom}
               </div>

               {showBottomExpandControls && (
                  <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 px-3 py-2">
                     <button
                        type="button"
                        onClick={() => applyQuickExpand(600)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[9px] font-black uppercase text-white hover:bg-orange-600"
                     >
                        +600 px
                     </button>
                     <button
                        type="button"
                        onClick={() => applyQuickExpand(1500)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[9px] font-black uppercase text-white hover:bg-orange-600"
                     >
                        +1500 px
                     </button>
                     <button
                        type="button"
                        onClick={expand2xViewport}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase text-slate-700 hover:bg-slate-50"
                     >
                        2× fenêtre
                     </button>
                  </div>
               )}

               {showBottomResizeGrip && (
                  <div
                     ref={bottomGripRef}
                     role="separator"
                     aria-orientation="horizontal"
                     aria-label={bottomGripHint ?? 'Redimensionner la hauteur totale du cadre par le bas'}
                     data-resize-grip="frame-bottom"
                     title={bottomGripTitle ?? gripLabel}
                     onPointerDown={onBottomGripPointerDown}
                     className={gripClass}
                  >
                     <GripHorizontal size={18} className="text-slate-400 group-hover:text-orange-500" strokeWidth={2.5} />
                     <span className="mt-0.5 text-[7px] font-black uppercase leading-none tracking-wide text-slate-400 group-hover:text-orange-600">
                        {gripLabel}
                     </span>
                  </div>
               )}
            </div>
         </div>
      </LiveMapFrameHeightContext.Provider>
   );
};
