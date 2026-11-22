import { useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { accountsApi, type Account } from "./api";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { AccountFileTree } from "./components/account-file-tree";

const levels = {
  CLASS: "Clase",
  GROUP: "Grupo",
  ACCOUNT: "Cuenta",
  SUBACCOUNT: "Subcuenta",
};
type Editor =
  | { kind: "create"; parent: Account | null }
  | { kind: "edit"; account: Account };

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = accounts.find((a) => a.code === selectedCode);
  const children = accounts.filter((a) => a.parentCode === selectedCode);

  async function load() {
    setLoading(true);
    try {
      setAccounts(await accountsApi.list());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    accountsApi
      .list(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAccounts(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  function saved(account: Account) {
    setAccounts((previous) =>
      [...previous.filter((a) => a.code !== account.code), account].sort(
        (a, b) => a.code.localeCompare(b.code),
      ),
    );
    setSelectedCode(account.code);
    setEditor(null);
    toast.success("Cuenta guardada");
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await accountsApi.remove(deleting.code);
      setAccounts((previous) =>
        previous.filter((a) => a.code !== deleting.code),
      );
      setSelectedCode(deleting.parentCode ?? undefined);
      setDeleting(null);
      toast.success("Cuenta eliminada");
    } catch {
      /* Global Axios interceptor reports the problem. */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-5">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <BookOpen />
          </div>
          <div>
            <p className="font-semibold">Aravia</p>
            <p className="text-xs text-muted-foreground">Gestión financiera</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Configuración contable
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Catálogo de cuentas
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Organiza tus clases, grupos, cuentas y subcuentas.
            </p>
          </div>
          <Button
            disabled={loading || failed}
            onClick={() => setEditor({ kind: "create", parent: null })}
          >
            <Plus />
            Nueva clase
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section
            className="overflow-hidden rounded-xl border bg-background shadow-sm"
            aria-label="Árbol de cuentas"
          >
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">Estructura de cuentas</h2>
                <p className="text-xs text-muted-foreground">
                  {accounts.length} cuentas registradas
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                onClick={() => void load()}
                aria-label="Actualizar catálogo"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  aria-label="Buscar por código o nombre"
                  placeholder="Buscar por código o nombre…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {loading ? (
                <p
                  role="status"
                  className="p-10 text-center text-muted-foreground"
                >
                  Cargando catálogo…
                </p>
              ) : failed ? (
                <div role="alert" className="p-8 text-center">
                  <p>No se pudo cargar el catálogo.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => void load()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : !accounts.length ? (
                <div className="p-10 text-center text-muted-foreground">
                  <BookOpen className="mx-auto mb-3 size-8" />
                  <p>Tu catálogo está vacío.</p>
                  <p className="mt-1 text-sm">Crea una clase para comenzar.</p>
                </div>
              ) : (
                <AccountFileTree
                  accounts={accounts}
                  selected={selectedCode}
                  onSelect={(a) => setSelectedCode(a.code)}
                  query={query}
                />
              )}
            </div>
          </section>
          <section
            className="self-start rounded-xl border bg-background p-6 shadow-sm"
            aria-label="Detalle de cuenta"
          >
            {selected ? (
              <>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {levels[selected.level]}
                    </span>
                    <p className="mt-5 font-mono text-3xl font-semibold">
                      {selected.code}
                    </p>
                    <h2 className="mt-1 break-words text-xl font-medium">
                      {selected.name}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${selected.nature === "DEBIT" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
                  >
                    {selected.nature === "DEBIT" ? "Débito" : "Crédito"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-5 border-y py-5 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Cuenta padre</dt>
                    <dd className="mt-1 font-medium">
                      {selected.parentCode ?? "Sin padre · Clase principal"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hijos directos</dt>
                    <dd className="mt-1 font-medium">{children.length}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    disabled={loading || failed}
                    onClick={() =>
                      setEditor({ kind: "create", parent: selected })
                    }
                  >
                    <Plus />
                    Agregar hijo
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loading || failed}
                    onClick={() =>
                      setEditor({ kind: "edit", account: selected })
                    }
                  >
                    <Pencil />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={loading || failed}
                    onClick={() => setDeleting(selected)}
                  >
                    <Trash2 />
                    Eliminar
                  </Button>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                  {children.length
                    ? "Esta cuenta tiene hijos. Si intentas eliminarla, el servidor rechazará la operación y mostrará el error correspondiente."
                    : "Solo se puede editar el nombre. El código y la naturaleza no cambian."}
                </p>
              </>
            ) : (
              <div className="py-16 text-center">
                <FolderPlaceholder />
                <h2 className="mt-4 font-semibold">Explora tu catálogo</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                  Selecciona una cuenta del árbol para ver su detalle, editarla
                  o agregar cuentas hijas.
                </p>
              </div>
            )}
          </section>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Jerarquía: Clase (1 dígito) → Grupo (2) → Cuenta (4) → Subcuenta (6)
        </p>
      </main>
      {editor && (
        <AccountEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <DialogTitle className="text-lg font-semibold">
            ¿Eliminar cuenta?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Se eliminará {deleting?.code} · {deleting?.name}. Esta acción no se
            puede deshacer.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Eliminando…" : "Eliminar cuenta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function FolderPlaceholder() {
  return <BookOpen className="mx-auto size-10 text-muted-foreground/50" />;
}
function AccountEditor({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: (account: Account) => void;
}) {
  const editing = editor.kind === "edit";
  const parent = editor.kind === "create" ? editor.parent : null;
  const [code, setCode] = useState(
    editing ? editor.account.code : (parent?.code ?? ""),
  );
  const [name, setName] = useState(editing ? editor.account.name : "");
  const [nature, setNature] = useState<Account["nature"]>(
    editing ? editor.account.nature : (parent?.nature ?? "DEBIT"),
  );
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      onSaved(
        editing
          ? await accountsApi.update(code, name)
          : await accountsApi.create({
              code,
              name,
              nature: parent ? undefined : nature,
            }),
      );
    } catch {
      /* Global error notification; keep form values. */
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogTitle className="text-lg font-semibold">
          {editing
            ? "Editar cuenta"
            : parent
              ? `Agregar hijo de ${parent.code}`
              : "Nueva clase"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {editing
            ? "Modifica el nombre de la cuenta."
            : parent
              ? `${parent.name}. La naturaleza se hereda del padre.`
              : "Crea el primer nivel de la jerarquía contable."}
        </DialogDescription>
        <form noValidate onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Código
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={editing || busy}
              inputMode="numeric"
              autoFocus={!editing}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoFocus={editing}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Naturaleza
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm disabled:opacity-60"
              value={nature}
              onChange={(e) => setNature(e.target.value as Account["nature"])}
              disabled={editing || !!parent || busy}
            >
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
            </select>
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cuenta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
