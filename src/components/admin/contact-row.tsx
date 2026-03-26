"use client";

import { deleteContact } from "@/lib/actions/contacts";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role_label: string | null;
  notes: string | null;
};

export function ContactRow({ contact }: { contact: Contact }) {
  async function handleDelete() {
    if (confirm(`Delete contact "${contact.name}"?`)) {
      await deleteContact(contact.id);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium">{contact.name}</p>
        <p className="text-xs text-gray-500">
          {[contact.role_label, contact.email, contact.phone].filter(Boolean).join(" | ") || "No details"}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
