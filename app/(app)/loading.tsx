import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="px-4 pb-28 pt-3">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-border/50 p-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
