"use client";

import { deleteDocument } from "@/lib/actions/documents";
import { StatusBadge } from "@/components/ui/status-badge";

type Document = {
  id: string;
  name: string;
  document_type: string;
  visibility: string;
  file_type: string | null;
  uploader_email: string;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  site_map: "Site Map",
  run_sheet: "Run Sheet",
  vendor_packet: "Vendor Packet",
  insurance_compliance: "Insurance/Compliance",
  stage_plot: "Stage Plot",
  parking_load_in: "Parking/Load-in",
  misc: "Misc",
};

export function DocumentRow({ document }: { document: Document }) {
  async function handleDelete() {
    if (confirm(`Delete document "${document.name}"?`)) {
      await deleteDocument(document.id);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium">{document.name}</p>
        <p className="text-xs text-gray-500">
          {typeLabels[document.document_type] || document.document_type} | {document.visibility.replace("_", " ")} | by {document.uploader_email} | {new Date(document.created_at).toLocaleDateString()}
        </p>
      </div>
      <button onClick={handleDelete} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Delete
      </button>
    </div>
  );
}
