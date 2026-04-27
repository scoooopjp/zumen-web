import { ImageResponse } from "next/og";

export const alt = "ZUMEN - つくれるDIY設計図";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY_DEEP = "#0F2A4A";
const NAVY_MID = "#1A3A5C";
const AMBER = "#D97B2A";
const AMBER_PALE = "#FEF3E2";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
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
              fontSize: "32px",
              fontWeight: 700,
              color: NAVY_DEEP,
              letterSpacing: "-0.02em",
            }}
          >
            ZUMEN
          </div>
          <div
            style={{
              fontSize: "20px",
              color: NAVY_MID,
              opacity: 0.7,
            }}
          >
            つくれるDIY設計図
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              color: NAVY_DEEP,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            サイズを入れるだけで
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              color: NAVY_DEEP,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            DIY設計図が完成。
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "40px",
            maxWidth: "900px",
          }}
        >
          <div style={{ fontSize: "26px", color: NAVY_MID, lineHeight: 1.5 }}>
            22種の設計図 × ホームセンター別の材料リスト。
          </div>
          <div style={{ fontSize: "26px", color: NAVY_MID, lineHeight: 1.5 }}>
            カインズ・コメリ・コーナン・DCM 対応。
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {["設計図", "材料リスト", "工程", "費用見積もり"].map((tag) => (
            <div
              key={tag}
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
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
