"use client";

import "goey-toast/styles.css";
import { GooeyToaster as BaseGooeyToaster, gooeyToast } from "goey-toast";

export function GooeyToaster() {
  return (
    <BaseGooeyToaster
      position="bottom-right"
      theme="light"
      gap={12}
      offset="24px"
      closeOnEscape
      swipeToDismiss
      spring
      bounce={0.32}
      maxQueue={5}
      queueOverflow="drop-oldest"
    />
  );
}

export { gooeyToast };
