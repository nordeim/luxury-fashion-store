"use client";

// Announcement bar — parity surface: bg-primary text-primary-foreground
// text-center py-2 text-xs tracking-[0.2em] font-light (static line; the
// reference renders a single centered row).

import { ANNOUNCEMENT_TEXT } from "@/lib/data/catalog";

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground text-center py-2 text-xs tracking-[0.2em] font-montserrat font-light px-4">
      {ANNOUNCEMENT_TEXT}
    </div>
  );
}
