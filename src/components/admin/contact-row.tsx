"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteContact } from "@/lib/actions/contacts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role_label: string | null;
  notes: string | null;
};

export function ContactRow({ contact }: { contact: Contact }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    const result = await deleteContact(contact.id);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Contact"
        message={`Delete contact "${contact.name}"?`}
        confirmLabel="Delete"
        onConfirm={async () => { await handleDelete(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div>
        <p className="text-sm font-medium">{contact.name}</p>
        <p className="text-xs text-gray-500">
          {[contact.role_label, contact.email, contact.phone].filter(Boolean).join(" | ") || "No details"}
        </p>
      </div>
      <button
        onClick={() => setConfirmOpen(true)}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
