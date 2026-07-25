import { ImageResponse } from "next/og";

import { carTaxiIcon, iconGradientStyle } from "@/lib/appIconSvg";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<div style={iconGradientStyle}>{carTaxiIcon(320, 1.7)}</div>, {
    width: 512,
    height: 512,
  });
}
