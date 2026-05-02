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
}: Props) {
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
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
