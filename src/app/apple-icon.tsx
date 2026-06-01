import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ff8811",
          color: "#1f1407",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 130,
          fontWeight: 700,
          borderRadius: 36,
          letterSpacing: -2,
        }}
      >
        ج
      </div>
    ),
    { ...size },
  );
}
