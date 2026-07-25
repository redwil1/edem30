import { ImageResponse } from "next/og";

import { carTaxiIcon } from "@/lib/appIconSvg";

export const runtime = "edge";
export const alt = "Едем30 — такси и попутчики по Астраханской области";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          padding: 60,
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 44,
          }}
        >
          {carTaxiIcon(118, 1.7)}
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 76,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
            display: "flex",
          }}
        >
          Едем<span style={{ color: "#e9d8fd" }}>30</span>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "sans-serif",
            display: "flex",
          }}
        >
          Такси и попутчики по Астраханской области
        </div>
      </div>
    ),
    { ...size }
  );
}
