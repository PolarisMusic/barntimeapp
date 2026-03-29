"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/lib/actions/documents";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

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
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete(): Promise<boolean> {
    const result = await deleteDocument(document.id);
    if (result?.error) {
      toast(result.error, "error");
      return false;
    } else {
      toast("Document deleted", "success");
      router.refresh();
      return true;
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Document"
        message={`Delete document "${document.name}"?`}
        confirmLabel="Delete"
        onConfirm={async () => { const ok = await handleDelete(); if (ok) setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div>
        <p className="text-sm font-medium">{document.name}</p>
        <p className="text-xs text-gray-500">
          {typeLabels[document.document_type] || document.document_type} | {document.visibility.replace("_", " ")} | by {document.uploader_email} | {new Date(document.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/api/documents/${document.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
        >
          Download
        </a>
        <button onClick={() => setConfirmOpen(true)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  );
}
