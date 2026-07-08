import { useEffect, useRef, type RefObject } from "react";

type SynchronizedHorizontalScrollRefs = {
  topScrollRef: RefObject<HTMLDivElement | null>;
  tableScrollRef: RefObject<HTMLDivElement | null>;
  scrollWidthRef: RefObject<HTMLDivElement | null>;
};

export function useSynchronizedHorizontalScroll(
  contentKey: string | number
): SynchronizedHorizontalScrollRefs {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scrollWidthRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    const widthAnchor = scrollWidthRef.current;
    if (!top || !table || !widthAnchor) return;

    const syncScrollWidth = () => {
      widthAnchor.style.width = `${table.scrollWidth}px`;
    };

    syncScrollWidth();

    const resizeObserver = new ResizeObserver(syncScrollWidth);
    resizeObserver.observe(table);

    const syncFromTop = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      table.scrollLeft = top.scrollLeft;
      isSyncingRef.current = false;
    };

    const syncFromTable = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      top.scrollLeft = table.scrollLeft;
      isSyncingRef.current = false;
    };

    top.addEventListener("scroll", syncFromTop, { passive: true });
    table.addEventListener("scroll", syncFromTable, { passive: true });

    return () => {
      resizeObserver.disconnect();
      top.removeEventListener("scroll", syncFromTop);
      table.removeEventListener("scroll", syncFromTable);
    };
  }, [contentKey]);

  return { topScrollRef, tableScrollRef, scrollWidthRef };
}
