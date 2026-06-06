import React, { useEffect, useRef, useState } from 'react';

type Props = {
   children: React.ReactNode;
   /** Hauteur / largeur du conteneur (ex. h-full w-full min-w-0) — le parent doit avoir une hauteur définie. */
   className?: string;
};

/**
 * Recharts + React 19 / StrictMode : évite NotFoundError (removeChild) en reportant après paint.
 * Évite aussi le warning « width(-1) height(-1) » : on ne monte pas ResponsiveContainer tant que le conteneur n’a pas une taille > 0.
 */
const DeferRechartsMount: React.FC<Props> = ({ children, className = 'h-full w-full min-w-0' }) => {
   const [frameOk, setFrameOk] = useState(false);
   const [sizeOk, setSizeOk] = useState(false);
   const elRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      let cancelled = false;
      const id = requestAnimationFrame(() => {
         requestAnimationFrame(() => {
            if (!cancelled) setFrameOk(true);
         });
      });
      return () => {
         cancelled = true;
         cancelAnimationFrame(id);
      };
   }, []);

   useEffect(() => {
      if (!frameOk) return;
      const el = elRef.current;
      if (!el) return;

      const update = () => {
         const r = el.getBoundingClientRect();
         const w = r.width;
         const h = r.height;
         setSizeOk(w > 0 && h > 0);
      };

      update();

      if (typeof ResizeObserver === 'undefined') {
         return;
      }

      const ro = new ResizeObserver(() => {
         update();
      });
      ro.observe(el);
      return () => ro.disconnect();
   }, [frameOk]);

   return (
      <div ref={elRef} className={className} aria-busy={!sizeOk}>
         {frameOk && sizeOk ? children : null}
      </div>
   );
};

export default DeferRechartsMount;
