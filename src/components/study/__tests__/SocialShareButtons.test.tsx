import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lucide-react", () => ({
  MessageCircle: ({ className }: { className?: string }) => (
    <svg data-testid="whatsapp-icon" className={className} />
  ),
  Share2: ({ className }: { className?: string }) => (
    <svg data-testid="twitter-icon" className={className} />
  ),
  Link2: ({ className }: { className?: string }) => (
    <svg data-testid="copy-icon" className={className} />
  ),
}));

const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

import { SocialShareButtons } from "../SocialShareButtons";

const defaultProps = {
  url: "https://verbum.vercel.app/estudos/genesis-1",
  title: "Estudo sobre Gênesis 1",
};

describe("SocialShareButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 4 sharing buttons with correct icons", () => {
    render(<SocialShareButtons {...defaultProps} />);

    expect(
      screen.getByRole("link", { name: "Compartilhar no WhatsApp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Compartilhar no Twitter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Compartilhar no Facebook" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar Link" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("whatsapp-icon")).toBeInTheDocument();
    expect(screen.getByTestId("twitter-icon")).toBeInTheDocument();
    expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
  });

  it("renders a group container with aria-label 'Compartilhar'", () => {
    render(<SocialShareButtons {...defaultProps} />);

    expect(
      screen.getByRole("group", { name: "Compartilhar" }),
    ).toBeInTheDocument();
  });

  describe("WhatsApp button", () => {
    it("generates correct wa.me share URL with encoded title and link", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no WhatsApp",
      });
      const href = link.getAttribute("href")!;

      expect(href).toContain("https://wa.me/");
      expect(href).toContain(
        encodeURIComponent(defaultProps.title),
      );
      expect(href).toContain(
        encodeURIComponent(defaultProps.url),
      );
    });

    it("opens in a new tab with noopener noreferrer", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no WhatsApp",
      });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Twitter button", () => {
    it("generates correct tweet intent URL with encoded title and link", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no Twitter",
      });
      const href = link.getAttribute("href")!;

      expect(href).toContain("https://twitter.com/intent/tweet");
      expect(href).toContain(
        `text=${encodeURIComponent(defaultProps.title)}`,
      );
      expect(href).toContain(
        `url=${encodeURIComponent(defaultProps.url)}`,
      );
    });

    it("opens in a new tab with noopener noreferrer", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no Twitter",
      });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Facebook button", () => {
    it("generates correct sharer URL with encoded link", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no Facebook",
      });
      const href = link.getAttribute("href")!;

      expect(href).toContain(
        "https://www.facebook.com/sharer/sharer.php",
      );
      expect(href).toContain(
        `u=${encodeURIComponent(defaultProps.url)}`,
      );
    });

    it("opens in a new tab with noopener noreferrer", () => {
      render(<SocialShareButtons {...defaultProps} />);

      const link = screen.getByRole("link", {
        name: "Compartilhar no Facebook",
      });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Copiar Link button", () => {
    it("copies URL to clipboard and shows toast on click", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      render(<SocialShareButtons {...defaultProps} />);

      const button = screen.getByRole("button", { name: "Copiar Link" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(defaultProps.url);
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Link copiado!");
    });

    it("copies the raw URL, not the encoded URL", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      render(<SocialShareButtons {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Copiar Link" }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(defaultProps.url);
      });
    });
  });

  describe("URL encoding", () => {
    it("properly encodes special characters in title and URL", () => {
      const props = {
        url: "https://verbum.vercel.app/estudos/estudo-com-espaços&chars",
        title: "Título com acentuação & caracteres especiais",
      };

      render(<SocialShareButtons {...props} />);

      const whatsappLink = screen.getByRole("link", {
        name: "Compartilhar no WhatsApp",
      });
      const href = whatsappLink.getAttribute("href")!;

      expect(href).toContain(encodeURIComponent(props.title));
      expect(href).toContain(encodeURIComponent(props.url));
      expect(href).not.toContain(" ");
    });
  });
});
