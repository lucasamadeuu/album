"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamProgress } from "@/lib/team-progress";
import type { FilterTab } from "@/lib/use-sticker-filter";

type Props = {
  teams: string[];
  team: string;
  onTeam: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
  tab: FilterTab;
  onTab: (t: FilterTab) => void;
  totalListed: number;
  totalOwned: number;
  totalStickers: number;
  /** Por seleção: quantas figurinhas você tem / total no catálogo. */
  teamProgress?: TeamProgress[];
};

export function CollectionToolbar({
  teams,
  team,
  onTeam,
  search,
  onSearch,
  tab,
  onTab,
  totalListed,
  totalOwned,
  totalStickers,
  teamProgress = [],
}: Props) {
  const activeProgress =
    team !== "__all__"
      ? teamProgress.find((p) => p.team === team) ?? null
      : null;

  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 pb-2.5 pt-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.78rem] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{totalOwned}</span>
          <span className="text-muted-foreground/80"> / </span>
          <span className="tabular-nums">{totalStickers}</span>
          <span className="ml-1 text-[0.68rem]">no álbum</span>
        </p>
        <p className="text-[0.65rem] tabular-nums text-muted-foreground">
          filtro: {totalListed}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Input
          placeholder="Buscar nome ou número…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className="h-9 text-[0.82rem]"
        />
        <Select value={team} onValueChange={onTeam}>
          <SelectTrigger aria-label="Seleção" className="h-9 text-[0.82rem]">
            <SelectValue placeholder="Seleção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as seleções</SelectItem>
            {teams.map((t) => {
              const pr = teamProgress.find((p) => p.team === t);
              const suffix = pr ? ` (${pr.have}/${pr.total})` : "";
              return (
                <SelectItem key={t} value={t}>
                  {t}
                  {suffix}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {teamProgress.length > 0 && team === "__all__" ? (
          <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
            <p className="mb-1.5 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              Por seleção
            </p>
            <div className="max-h-[min(40vh,12rem)] overflow-y-auto pr-0.5">
              <ul className="grid gap-1 sm:grid-cols-2">
                {teamProgress.map(({ team: sel, have, total }) => (
                  <li
                    key={sel}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[0.7rem]"
                  >
                    <span className="min-w-0 truncate text-foreground">{sel}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{have}</span>
                      <span className="text-muted-foreground/80"> de </span>
                      {total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {activeProgress ? (
          <p className="text-[0.72rem] text-muted-foreground">
            Nesta seleção:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {activeProgress.have}
            </span>
            <span className="text-muted-foreground/80"> de </span>
            <span className="tabular-nums">{activeProgress.total}</span>
            <span className="ml-1 text-[0.65rem]">figurinhas</span>
          </p>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(
          [
            ["all", "Todas"],
            ["missing", "Faltam"],
            ["have", "Tenho"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "default" : "outline"}
            size="sm"
            className="h-9 text-[0.72rem] font-medium"
            onClick={() => onTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
