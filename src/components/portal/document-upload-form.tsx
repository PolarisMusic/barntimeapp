"use client";

import { useState, useRef } from "react";
import { uploadDocument } from "@/lib/actions/documents";

const documentTypes = [
  { value: "run_sheet", label: "Run Sheet" },
  { value: "site_map", label: "Site Map" },
  { value: "vendor_packet", label: "Vendor Packet" },
  { value: "insurance_compliance", label: "Insurance / Compliance" },
  { value: "stage_plot", label: "Stage Plot" },
  { value: "parking_load_in", label: "Parking / Load-in" },
  { value: "misc", label: "Misc" },
];

export function DocumentUploadForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;

    setSubmitting(true);
    setError(null);

    const fd = new FormData(formRef.current);
    fd.set("event_id", eventId);

    const result = await uploadDocument(fd);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      formRef.current.reset();
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Upload Document
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border-t border-gray-200 px-4 py-4"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            File
          </label>
          <input
            type="file"
            name="file"
            required
            className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="Document name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Type
            </label>
            <select
              name="document_type"
              defaultValue="misc"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {documentTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Visibility
            </label>
            <select
              name="visibility"
              defaultValue="owner_only"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="owner_only">Owner only</option>
              <option value="all_participants">All participants</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            name="notes"
            placeholder="Optional notes"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    </form>
  );
}
