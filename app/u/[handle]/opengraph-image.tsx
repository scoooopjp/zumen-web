import { ImageResponse } from "next/og";
import { fetchUserProfileByUsername } from "@/lib/firestore";

export const alt = "ZUMEN プロフィール";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY_DEEP = "#0F2A4A";
const NAVY_MID = "#1A3A5C";
const AMBER = "#D97B2A";
const AMBER_PALE = "#FEF3E2";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Image({ params }: Props) {
  const { handle } = await params;
  const profile = await fetchUserProfileByUsername(handle);
  const displayName = profile?.displayName ?? "ZUMEN";
  const bio = profile?.bio?.slice(0, 100) ?? "";
  const photoURL = profile?.photoURL ?? null;

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
          <div style={{ fontSize: "20px", color: NAVY_MID, opacity: 0.7 }}>
            つくれるDIY設計図
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "32px",
          }}
        >
          {photoURL ? (
            <img
              src={photoURL}
              width={180}
              height={180}
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "999px",
                objectFit: "cover",
                border: `4px solid ${AMBER}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "180px",
                height: "180px",
                borderRadius: "999px",
                background: AMBER_PALE,
                border: `4px solid ${AMBER}`,
                fontSize: "80px",
                color: NAVY_DEEP,
                fontWeight: 800,
              }}
            >
              {displayName.slice(0, 1)}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "780px",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                fontWeight: 800,
                color: NAVY_DEEP,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: "24px",
                color: NAVY_MID,
                opacity: 0.7,
                marginTop: "8px",
              }}
            >
              @{handle}
            </div>
          </div>
        </div>

        {bio.length > 0 ? (
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              color: NAVY_MID,
              lineHeight: 1.5,
              maxWidth: "1040px",
            }}
          >
            {bio}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              color: NAVY_MID,
              lineHeight: 1.5,
            }}
          >
            ZUMEN で DIY 作例を共有中
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
