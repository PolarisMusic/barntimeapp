"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function InlineEditField({
  value,
  onSave,
  placeholder,
  multiline,
}: {
  value: string;
  onSave: (newValue: string) => Promise<{ error?: string }>;
  placeholder?: string;
  multiline?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Resync draft when the server value changes (e.g. after refresh)
  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  async function handleSave() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(draft);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      setSaved(true);
      router.refresh();
    }
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Enter" && e.metaKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <p
          className={`text-sm ${value ? "text-gray-700" : "text-gray-400 italic"}`}
        >
          {value || placeholder || "No notes"}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
        >
          Edit
        </button>
        {saved && (
          <span className="text-xs text-green-600">Saved</span>
        )}
      </div>
    );
  }

  const inputProps = {
    ref: inputRef as React.Ref<HTMLTextAreaElement & HTMLInputElement>,
    value: draft,
    onChange: (
      e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
    ) => setDraft(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder: placeholder || "Add notes...",
    disabled: saving,
    className:
      "w-full rounded-md border border-blue-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50",
  };

  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea {...inputProps} rows={3} />
      ) : (
        <input type="text" {...inputProps} />
      )}
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
