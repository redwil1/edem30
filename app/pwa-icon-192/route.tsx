import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          color: "white",
          fontSize: 118,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        Е
      </div>
    ),
    { width: 192, height: 192 }
  );
}
