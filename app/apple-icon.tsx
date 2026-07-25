import { ImageResponse } from "next/og";

import { carTaxiIcon, iconGradientStyle } from "@/lib/appIconSvg";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={iconGradientStyle}>{carTaxiIcon(112, 1.7)}</div>,
    { ...size }
  );
}
