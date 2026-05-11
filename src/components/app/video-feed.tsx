"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { youTubeEmbedUrl } from "@/lib/youtube";

export type FeedVideo = {
  id: string;
  title: string;
  caption: string | null;
  youtubeId: string;
  eventSlug: string | null;
  eventName: string | null;
};

export function VideoFeed({ videos }: { videos: FeedVideo[] }) {
  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = (entry.target as HTMLElement).dataset.videoId;
            if (id) setActiveId(id);
          }
        }
      },
      { root, threshold: [0.6] }
    );

    const items = root.querySelectorAll<HTMLElement>("[data-video-id]");
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-7rem)] snap-y snap-mandatory overflow-y-scroll bg-black"
    >
      {videos.map((video) => {
        const isActive = video.id === activeId;
        return (
          <section
            key={video.id}
            data-video-id={video.id}
            className="relative flex h-[calc(100dvh-7rem)] w-full snap-start items-center justify-center"
          >
            <div className="relative aspect-[9/16] h-full max-h-full w-full max-w-[min(100%,calc((100dvh-7rem)*9/16))]">
              {isActive ? (
                <iframe
                  key={video.id}
                  src={youTubeEmbedUrl(video.youtubeId, {
                    autoplay: true,
                    mute: true,
                    loop: true,
                  })}
                  title={video.title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg)`,
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                <h2 className="text-lg font-semibold leading-tight">
                  {video.title}
                </h2>
                {video.caption && (
                  <p className="mt-1 text-sm text-white/85">{video.caption}</p>
                )}
                {video.eventSlug && (
                  <Link
                    href={`/events/${video.eventSlug}`}
                    className="pointer-events-auto mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/25"
                  >
                    {video.eventName ? `→ ${video.eventName}` : "View event"}
                  </Link>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
