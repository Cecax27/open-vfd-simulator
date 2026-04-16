import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "../../lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>;

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200">
        <SliderPrimitive.Range className="absolute h-full bg-teal-700" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-teal-700 bg-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
