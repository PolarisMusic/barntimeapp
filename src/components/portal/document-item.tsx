"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument, updateDocument } from "@/lib/actions/documents";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

const typeLabels: Record<string, string> = {
  site_map: "Site Map",
  run_sheet: "Run Sheet",
  vendor_packet: "Vendor Packet",
  insurance_compliance: "Insurance / Compliance",
  stage_plot: "Stage Plot",
  parking_load_in: "Parking / Load-in",
  misc: "Misc",
};

const typeOptions = [
  { value: "run_sheet", label: "Run Sheet" },
  { value: "site_map", label: "Site Map" },
  { value: "vendor_packet", label: "Vendor Packet" },
  { value: "insurance_compliance", label: "Insurance / Compliance" },
  { value: "stage_plot", label: "Stage Plot" },
  { value: "parking_load_in", label: "Parking / Load-in" },
  { value: "misc", label: "Misc" },
];

export function DocumentItem({
  doc,
  canManage,
}: {
  doc: {
    id: string;
    name: string;
    document_type: string;
    visibility: string;
    notes: string | null;
    created_at: string;
  };
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Edit fields
  const [name, setName] = useState(doc.name);
  const [docType, setDocType] = useState(doc.document_type);
  const [visibility, setVisibility] = useState(doc.visibility);
  const [notes, setNotes] = useState(doc.notes || "");

  // Resync edit fields when server data changes and we're not editing
  useEffect(() => {
    if (!editing) {
      setName(doc.name);
      setDocType(doc.document_type);
      setVisibility(doc.visibility);
      setNotes(doc.notes || "");
    }
  }, [doc.name, doc.document_type, doc.visibility, doc.notes, editing]);

  async function handleDelete(): Promise<boolean> {
    setDeleting(true);
    const result = await deleteDocument(doc.id);
    if (result.error) {
      toast(result.error, "error");
      setDeleting(false);
      return false;
    } else {
      toast("Document deleted", "success");
      setDeleted(true);
      router.refresh();
      return true;
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("document_type", docType);
    fd.set("visibility", visibility);
    fd.set("notes", notes);
    const result = await updateDocument(doc.id, fd);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      toast("Document updated", "success");
      setEditing(false);
      router.refresh();
    }
  }

  function handleCancel() {
    setName(doc.name);
    setDocType(doc.document_type);
    setVisibility(doc.visibility);
    setNotes(doc.notes || "");
    setEditing(false);
    setError(null);
  }

  if (deleted) return null;

  if (editing) {
    return (
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="owner_only">Owner only</option>
              <option value="all_participants">All participants</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Document"
        message={`Delete "${doc.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          const ok = await handleDelete();
          if (ok) setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div>
        <p className="text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-gray-500">
          {typeLabels[doc.document_type] || doc.document_type}
          {" · "}
          {new Date(doc.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {doc.visibility === "owner_only" && (
            <span className="ml-1.5 text-amber-500">Owner only</span>
          )}
        </p>
        {doc.notes && (
          <p className="mt-0.5 text-xs text-gray-400">{doc.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/api/documents/${doc.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          Download
        </a>
        {canManage && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
