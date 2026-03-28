"use client";

import { useState } from "react";
import { deleteDocument } from "@/lib/actions/documents";

const typeLabels: Record<string, string> = {
  site_map: "Site Map",
  run_sheet: "Run Sheet",
  vendor_packet: "Vendor Packet",
  insurance_compliance: "Insurance / Compliance",
  stage_plot: "Stage Plot",
  parking_load_in: "Parking / Load-in",
  misc: "Misc",
};

export function DocumentItem({
  doc,
  canManage,
}: {
  doc: {
    id: string;
    name: string;
    document_type: string;
    visibility: string;
    created_at: string;
  };
  canManage: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    setDeleting(true);
    const result = await deleteDocument(doc.id);
    if (result.error) {
      alert(result.error);
      setDeleting(false);
    } else {
      setDeleted(true);
    }
  }

  if (deleted) return null;

  return (
    <div className="flex items-center justify-between p-4">
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
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "..." : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
