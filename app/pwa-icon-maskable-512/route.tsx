import { ImageResponse } from "next/og";

export const runtime = "edge";

// Иконка для Android adaptive/maskable — фон должен доходить до краёв,
// а сам символ уменьшен и оставлен в безопасной зоне (~центральные 80%),
// чтобы не обрезался при маскировании под круг/квадрат со скруглением/каплю.
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
          fontSize: 200,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        Е
      </div>
    ),
    { width: 512, height: 512 }
  );
}
