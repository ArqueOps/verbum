"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface SocialShareButtonsProps {
  url: string;
  title: string;
}

const ICON_SIZE = "size-4";

export function SocialShareButtons({ url, title }: SocialShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const whatsappUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  const linkClass =
    "inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Compartilhar">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no WhatsApp"
        className={linkClass}
      >
        <MessageCircle className={ICON_SIZE} />
      </a>

      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Twitter"
        className={linkClass}
      >
        <Share2 className={ICON_SIZE} />
      </a>

      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Facebook"
        className={linkClass}
      >
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={handleCopyLink}
        aria-label="Copiar Link"
        className={linkClass}
      >
        <Link2 className={ICON_SIZE} />
      </button>
    </div>
  );
}
