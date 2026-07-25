import { ImageResponse } from "next/og";

import { carTaxiIcon, iconGradientStyle } from "@/lib/appIconSvg";

export const runtime = "edge";

// Иконка для Android adaptive/maskable — фон должен доходить до краёв,
// а сам символ уменьшен и оставлен в безопасной зоне (~центральные 80%),
// чтобы не обрезался при маскировании под круг/квадрат со скруглением/каплю.
export async function GET() {
  return new ImageResponse(<div style={iconGradientStyle}>{carTaxiIcon(210, 1.7)}</div>, {
    width: 512,
    height: 512,
  });
}
