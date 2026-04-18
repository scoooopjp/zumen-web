import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? "つくれるDIY設計図";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const budget = searchParams.get("budget") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#ffffff",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* ロゴ */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "auto" }}>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#4f46e5",
              letterSpacing: "-0.5px",
            }}
          >
            ZUMEN
          </div>
          {category && (
            <div
              style={{
                fontSize: "16px",
                color: "#6b7280",
                background: "#f3f4f6",
                padding: "4px 12px",
                borderRadius: "999px",
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* タイトル */}
        <div
          style={{
            fontSize: title.length > 15 ? "60px" : "72px",
            fontWeight: "bold",
            color: "#111827",
            lineHeight: 1.2,
            marginBottom: "24px",
          }}
        >
          {title}
        </div>

        {/* メタ情報 */}
        <div style={{ display: "flex", gap: "16px" }}>
          {difficulty && (
            <div
              style={{
                fontSize: "20px",
                color: "#059669",
                background: "#ecfdf5",
                padding: "8px 20px",
                borderRadius: "999px",
              }}
            >
              {difficulty}
            </div>
          )}
          {budget && (
            <div
              style={{
                fontSize: "20px",
                color: "#374151",
                background: "#f9fafb",
                padding: "8px 20px",
                borderRadius: "999px",
              }}
            >
              {budget}
            </div>
          )}
        </div>

        {/* 装飾 */}
        <div
          style={{
            position: "absolute",
            right: "60px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "200px",
            opacity: 0.06,
          }}
        >
          🪚
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
