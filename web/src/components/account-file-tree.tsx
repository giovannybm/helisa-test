import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { Account } from "../api";
import { cn } from "../lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

/** File-tree composed with shadcn/Radix Collapsible. Native buttons support keyboard navigation. */
export function AccountFileTree({
  accounts,
  selected,
  onSelect,
  query,
}: {
  accounts: Account[];
  selected?: string;
  onSelect: (account: Account) => void;
  query: string;
}) {
  const visible = new Set<string>();
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const search = query.trim().toLocaleLowerCase();
  for (const account of accounts) {
    if (
      !search ||
      `${account.code} ${account.name}`.toLocaleLowerCase().includes(search)
    ) {
      let current: Account | undefined = account;
      while (current) {
        visible.add(current.code);
        current = current.parentCode
          ? byCode.get(current.parentCode)
          : undefined;
      }
    }
  }
  function nodes(parent: string | null): React.ReactNode {
    return accounts
      .filter((a) => a.parentCode === parent && visible.has(a.code))
      .map((account) => (
        <TreeNode
          key={account.code}
          account={account}
          selected={selected === account.code}
          onSelect={() => onSelect(account)}
          searching={!!search}
          hasChildren={accounts.some((a) => a.parentCode === account.code)}
        >
          {nodes(account.code)}
        </TreeNode>
      ));
  }
  return (
    <nav aria-label="Catálogo de cuentas">
      {visible.size ? (
        <ul className="space-y-1">{nodes(null)}</ul>
      ) : (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No se encontraron cuentas.
        </p>
      )}
    </nav>
  );
}
function TreeNode({
  account,
  selected,
  onSelect,
  searching,
  hasChildren,
  children,
}: {
  account: Account;
  selected: boolean;
  onSelect: () => void;
  searching: boolean;
  hasChildren: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const Icon = hasChildren
    ? open || searching
      ? FolderOpen
      : Folder
    : FileText;
  return (
    <li>
      <Collapsible open={searching || open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex items-center rounded-md hover:bg-muted",
            selected && "bg-primary/10 text-primary",
          )}
        >
          {hasChildren ? (
            <CollapsibleTrigger
              className="p-2"
              aria-label={`Expandir o contraer ${account.code}`}
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  (searching || open) && "rotate-90",
                )}
              />
            </CollapsibleTrigger>
          ) : (
            <span className="w-8 shrink-0" />
          )}
          <button
            onClick={onSelect}
            aria-current={selected ? "true" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-mono font-semibold">{account.code}</span>
            <span className="truncate">{account.name}</span>
          </button>
        </div>
        {hasChildren && (
          <CollapsibleContent>
            <ul className="ml-4 space-y-1 border-l pl-3">{children}</ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}
