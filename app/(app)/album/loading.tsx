import { Skeleton } from "@/components/ui/skeleton";

export default function AlbumLoading() {
  return (
    <div className="px-4 pb-28 pt-3">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-full max-w-sm" />
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/30 p-3">
        <div className="mb-3 flex gap-3">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
