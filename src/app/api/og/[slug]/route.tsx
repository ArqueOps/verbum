import { ImageResponse } from "next/og";
import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

const GOLD = "#D4AF37";
const NAVY = "#1E3A5F";
const PARCHMENT = "#F5E6C8";
const PARCHMENT_DARK = "#E8D5B0";

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

function renderFallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${PARCHMENT} 0%, ${PARCHMENT_DARK} 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "-2px",
            }}
          >
            Verbum
          </div>
          <div
            style={{
              width: 120,
              height: 4,
              backgroundColor: GOLD,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 28,
              color: NAVY,
              opacity: 0.7,
            }}
          >
            Estudos Bíblicos
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = createSupabaseClient();

  if (!supabase) {
    return renderFallbackImage();
  }

  const { data: study } = await supabase
    .from("studies")
    .select("title, verse_reference")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!study) {
    return renderFallbackImage();
  }

  const title =
    study.title.length > 80 ? study.title.slice(0, 77) + "..." : study.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${PARCHMENT} 0%, ${PARCHMENT_DARK} 100%)`,
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: NAVY,
                letterSpacing: "-1px",
              }}
            >
              Verbum
            </div>
            <div
              style={{
                width: 60,
                height: 3,
                backgroundColor: GOLD,
                borderRadius: 2,
              }}
            />
          </div>

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              flex: 1,
              justifyContent: "center",
              paddingLeft: "20px",
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: NAVY,
                lineHeight: 1.2,
                letterSpacing: "-1px",
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 32,
                  backgroundColor: GOLD,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  fontSize: 28,
                  color: GOLD,
                  fontWeight: 600,
                }}
              >
                {study.verse_reference}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                color: NAVY,
                opacity: 0.5,
              }}
            >
              verbum-two.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
