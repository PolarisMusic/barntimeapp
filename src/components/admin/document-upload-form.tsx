"use client";

import { useState } from "react";
import { uploadDocument } from "@/lib/actions/documents";
import { FormButton } from "@/components/ui/form-button";

const DOCUMENT_TYPES = [
  { value: "site_map", label: "Site Map" },
  { value: "run_sheet", label: "Run Sheet" },
  { value: "vendor_packet", label: "Vendor Packet" },
  { value: "insurance_compliance", label: "Insurance / Compliance" },
  { value: "stage_plot", label: "Stage Plot" },
  { value: "parking_load_in", label: "Parking / Load-in" },
  { value: "misc", label: "Miscellaneous" },
];

export function DocumentUploadForm({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    const result = await uploadDocument(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setSuccess(true);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Upload Document</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Document Name</label>
          <input id="name" name="name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="document_type" className="mb-1 block text-sm font-medium">Type</label>
          <select id="document_type" name="document_type" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="file" className="mb-1 block text-sm font-medium">File</label>
          <input id="file" name="file" type="file" required className="w-full text-sm" />
        </div>
        <div>
          <label htmlFor="visibility" className="mb-1 block text-sm font-medium">Visibility</label>
          <select id="visibility" name="visibility" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="owner_only">Owner Only</option>
            <option value="all_participants">All Participants</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
        <textarea id="notes" name="notes" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Document uploaded.</div>}

      <FormButton>Upload</FormButton>
    </form>
  );
}
