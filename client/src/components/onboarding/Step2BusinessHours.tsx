import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, AlertCircle } from "lucide-react";
import type { StepProps } from "../OnboardingWizard";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface BusinessDay {
  day: DayKey;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface DayError {
  day: DayKey;
  message: string;
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_OPEN_TIME = "09:00";
const DEFAULT_CLOSE_TIME = "22:00";

function getDefaultBusinessHours(): BusinessDay[] {
  return DAYS.map(({ key }) => ({
    day: key,
    isOpen: key !== "sun", // Closed on Sunday by default
    openTime: DEFAULT_OPEN_TIME,
    closeTime: DEFAULT_CLOSE_TIME,
  }));
}

function parseBusinessHours(data: Record<string, unknown>): BusinessDay[] {
  if (!data.businessHours || !Array.isArray(data.businessHours)) {
    return getDefaultBusinessHours();
  }

  const hours = data.businessHours as BusinessDay[];

  // Ensure all days are present
  return DAYS.map(({ key }) => {
    const existing = hours.find((h) => h.day === key);
    if (existing) {
      return {
        day: key,
        isOpen: existing.isOpen ?? true,
        openTime: existing.openTime || DEFAULT_OPEN_TIME,
        closeTime: existing.closeTime || DEFAULT_CLOSE_TIME,
      };
    }
    return {
      day: key,
      isOpen: key !== "sun",
      openTime: DEFAULT_OPEN_TIME,
      closeTime: DEFAULT_CLOSE_TIME,
    };
  });
}

function validateTime(openTime: string, closeTime: string): string | null {
  if (!openTime || !closeTime) return null;

  const [openHour, openMin] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  if (closeMinutes <= openMinutes) {
    return "Closing time must be after opening time";
  }

  return null;
}

export function Step2BusinessHours({ data, onUpdate }: StepProps) {
  const [businessHours, setBusinessHours] = useState<BusinessDay[]>(() =>
    parseBusinessHours(data)
  );
  const [errors, setErrors] = useState<DayError[]>([]);

  const validateAndUpdate = useCallback(
    (updatedHours: BusinessDay[]) => {
      const newErrors: DayError[] = [];

      updatedHours.forEach((day) => {
        if (day.isOpen) {
          const error = validateTime(day.openTime, day.closeTime);
          if (error) {
            newErrors.push({ day: day.day, message: error });
          }
        }
      });

      setErrors(newErrors);
      setBusinessHours(updatedHours);

      // Only update parent if no errors
      if (newErrors.length === 0) {
        onUpdate({ businessHours: updatedHours });
      }
    },
    [onUpdate]
  );

  const handleToggle = (dayKey: DayKey, isOpen: boolean) => {
    const updated = businessHours.map((day) =>
      day.day === dayKey ? { ...day, isOpen } : day
    );
    validateAndUpdate(updated);
  };

  const handleTimeChange = (
    dayKey: DayKey,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    const updated = businessHours.map((day) =>
      day.day === dayKey ? { ...day, [field]: value } : day
    );
    validateAndUpdate(updated);
  };

  const handleCopyToAll = () => {
    // Find the first open day to copy from
    const sourceDay = businessHours.find((day) => day.isOpen);

    if (!sourceDay) {
      return; // No open day to copy from
    }

    // Copy times to all days, preserving each day's open/closed status
    const updated = businessHours.map((day) => ({
      ...day,
      openTime: sourceDay.openTime,
      closeTime: sourceDay.closeTime,
    }));

    validateAndUpdate(updated);
  };

  const getErrorForDay = (dayKey: DayKey): string | undefined => {
    return errors.find((e) => e.day === dayKey)?.message;
  };

  const hasAnyOpenDay = businessHours.some((day) => day.isOpen);

  return (
    <div className="space-y-6">
      {/* Copy to all days button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyToAll}
          disabled={!hasAnyOpenDay}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy to all days
        </Button>
      </div>

      {/* Days list */}
      <div className="space-y-4">
        {DAYS.map(({ key, label }) => {
          const dayData = businessHours.find((d) => d.day === key);
          const isOpen = dayData?.isOpen ?? false;
          const openTime = dayData?.openTime || DEFAULT_OPEN_TIME;
          const closeTime = dayData?.closeTime || DEFAULT_CLOSE_TIME;
          const error = getErrorForDay(key);

          return (
            <div
              key={key}
              className={`p-4 rounded-lg border transition-colors ${
                isOpen
                  ? "bg-white border-slate-200"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Day name and toggle */}
                <div className="flex items-center gap-4 min-w-[140px]">
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                    aria-label={`Toggle ${label}`}
                  />
                  <Label
                    className={`font-medium ${
                      isOpen ? "text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </Label>
                </div>

                {/* Time inputs */}
                {isOpen ? (
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`${key}-open`}
                        className="text-sm text-slate-600"
                      >
                        Open
                      </Label>
                      <Input
                        id={`${key}-open`}
                        type="time"
                        value={openTime}
                        onChange={(e) =>
                          handleTimeChange(key, "openTime", e.target.value)
                        }
                        className={`w-[120px] ${error ? "border-red-500" : ""}`}
                      />
                    </div>
                    <span className="text-slate-400">–</span>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`${key}-close`}
                        className="text-sm text-slate-600"
                      >
                        Close
                      </Label>
                      <Input
                        id={`${key}-close`}
                        type="time"
                        value={closeTime}
                        onChange={(e) =>
                          handleTimeChange(key, "closeTime", e.target.value)
                        }
                        className={`w-[120px] ${error ? "border-red-500" : ""}`}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Closed</span>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation warning */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the time errors above before continuing.
          </AlertDescription>
        </Alert>
      )}

      {/* Tip box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Set your regular business hours here. You can
          always adjust them later or set special hours for holidays in the
          dashboard.
        </p>
      </div>
    </div>
  );
}
