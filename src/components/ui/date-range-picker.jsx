"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

export function DateRangePicker({ className, ...props }) {
  const [date, setDate] = React.useState(props.value)

  React.useEffect(() => {
    setDate(props.value)
  }, [props.value])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                `${format(date.from, "PPP")} - ${format(date.to, "PPP")}`
              ) : (
                format(date.from, "PPP")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from ? date.from : new Date()}
            selected={date}
            onSelect={(date) => {
              setDate(date)
              props?.onValueChange(date)
            }}
            numberOfMonths={2}
            pagedNavigation
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const DateRange = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div className={cn("flex items-center", className)} ref={ref}>
      DateRange
    </div>
  )
})
DateRange.displayName = "DateRange"
