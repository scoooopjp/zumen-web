import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const NAVY_DEEP = "#0F2A4A";
const NAVY_MID = "#1A3A5C";
const AMBER = "#D97B2A";
const AMBER_PALE = "#FEF3E2";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? "つくれるDIY設計図";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const budget = searchParams.get("budget") ?? "";
  const icon = searchParams.get("icon") ?? "🪚";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: `linear-gradient(135deg, #FFFFFF 0%, ${AMBER_PALE} 100%)`,
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: `linear-gradient(90deg, ${AMBER} 0%, ${NAVY_DEEP} 100%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: NAVY_DEEP,
              letterSpacing: "-0.02em",
            }}
          >
            ZUMEN
          </div>
          {category && (
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: NAVY_MID,
                background: "rgba(255, 255, 255, 0.7)",
                border: `2px solid ${AMBER}`,
                padding: "4px 16px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 15 ? "60px" : "72px",
            fontWeight: 800,
            color: NAVY_DEEP,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {difficulty && (
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                color: NAVY_DEEP,
                background: "rgba(255, 255, 255, 0.7)",
                border: `2px solid ${AMBER}`,
                padding: "8px 20px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              {difficulty}
            </div>
          )}
          {budget && (
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                color: NAVY_DEEP,
                background: "rgba(255, 255, 255, 0.7)",
                border: `2px solid ${AMBER}`,
                padding: "8px 20px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              {budget}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            right: "60px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "200px",
            opacity: 0.08,
          }}
        >
          {icon}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
