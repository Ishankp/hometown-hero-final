"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  const rootId = React.useId();

  React.useEffect(() => {
    const viewport = document.querySelector(`[data-scroll-area-root="${rootId}"] [data-slot="scroll-area-viewport"]`) as HTMLElement | null;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, viewport.scrollTop + event.deltaY));
      viewport.scrollTop = nextScrollTop;
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [rootId]);

  return (
    <ScrollAreaPrimitive.Root
      data-scroll-area-root={rootId}
      data-slot="scroll-area"
      className={cn("relative overscroll-contain", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] overscroll-contain transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
