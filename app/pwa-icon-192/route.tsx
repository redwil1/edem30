import { ImageResponse } from "next/og";

import { carTaxiIcon, iconGradientStyle } from "@/lib/appIconSvg";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<div style={iconGradientStyle}>{carTaxiIcon(120, 1.7)}</div>, {
    width: 192,
    height: 192,
  });
}
