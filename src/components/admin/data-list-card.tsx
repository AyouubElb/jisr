"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface DataListCardProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  isLoading?: boolean;
  isEmpty: boolean;
  emptyState: { icon: React.ReactNode; message: string };
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: readonly number[];
  };
  loadingRowCount?: number;
  children: React.ReactNode;
}

export function DataListCard({
  search,
  isLoading = false,
  isEmpty,
  emptyState,
  pagination,
  loadingRowCount = 4,
  children,
}: DataListCardProps): React.JSX.Element {
  return (
    <Card className="gap-0! py-0!">
      <CardContent className="p-0!">
        {search && (
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={search.placeholder}
                className="pl-9"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: loadingRowCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-muted-foreground [&_svg]:h-8 [&_svg]:w-8">
              {emptyState.icon}
            </span>
            <p className="text-sm text-muted-foreground">{emptyState.message}</p>
          </div>
        ) : (
          <div className="divide-y">{children}</div>
        )}

        {pagination && !isLoading && !isEmpty && (
          <DataListPagination {...pagination} />
        )}
      </CardContent>
    </Card>
  );
}

function DataListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: NonNullable<DataListCardProps["pagination"]>): React.JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const fromItem = page * pageSize + 1;
  const toItem = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t p-4 md:flex-row md:items-center">
      <p className="text-xs text-muted-foreground">
        {fromItem}-{toItem} sur {totalCount}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && pageSizeOptions && (
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
