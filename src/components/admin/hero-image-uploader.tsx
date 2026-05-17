"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadEventHero } from "@/lib/actions/events";

export function HeroImageUploader({
  eventId,
  currentUrl,
}: {
  eventId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("file", file);

    startTransition(async () => {
      const result = await uploadEventHero(fd);
      if (result.error || !result.data) {
        setError(result.error ?? "Upload failed");
        return;
      }
      setPreviewUrl(result.data.url);
      router.refresh();
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Hero image</p>
      <div className="flex items-start gap-4">
        <div
          className="h-24 w-40 flex-shrink-0 rounded-md border border-gray-200 bg-gray-100 bg-cover bg-center"
          style={
            previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined
          }
        />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onPick}
            disabled={isPending}
            className="text-sm"
          />
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, or AVIF. Max 8 MB.{" "}
            {isPending && <span className="text-blue-600">Uploading…</span>}
          </p>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
