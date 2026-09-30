import { format } from "date-fns";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { DevicesIcon } from "@phosphor-icons/react/dist/csr/Devices";
import { cn } from "@/lib/utils";

interface ActivityMetadataProps {
  occurredAt: Date | string;
  deviceInfo: string;
  className?: string;
  timeTestId?: string;
  deviceTestId?: string;
  fullTimestampTestId?: string;
  showFullTimestamp?: boolean;
}

export function DeviceInfo({ deviceInfo, className, testId }: { deviceInfo: string; className?: string; testId?: string }) {
  return (
    <span className={cn("flex min-w-0 items-start gap-1", className)}>
      <DevicesIcon className="mt-px h-3.5 w-3.5 shrink-0" />
      <span className="break-words" data-testid={testId}>{deviceInfo}</span>
    </span>
  );
}

export default function ActivityMetadata({
  occurredAt,
  deviceInfo,
  className,
  timeTestId,
  deviceTestId,
  fullTimestampTestId,
  showFullTimestamp = true,
}: ActivityMetadataProps) {
  const timestamp = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);

  return (
    <div className={className}>
      <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-start sm:gap-4">
        <span className="flex shrink-0 items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          <span data-testid={timeTestId}>{format(timestamp, "h:mm:ss a")}</span>
        </span>
        <DeviceInfo deviceInfo={deviceInfo} testId={deviceTestId} />
      </div>
      {showFullTimestamp && (
        <p className="mt-1 text-xs text-gray-400" data-testid={fullTimestampTestId}>
          Full timestamp: {format(timestamp, "MMM d, yyyy 'at' h:mm:ss a")}
        </p>
      )}
    </div>
  );
}
