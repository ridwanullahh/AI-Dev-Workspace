import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    role="checkbox"
    aria-checked={checked}
    type="button"
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center",
      checked && "bg-primary text-primary-foreground",
      className
    )}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  >
    {checked && <Check className="h-4 w-4" />}
  </button>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
