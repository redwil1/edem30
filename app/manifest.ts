import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Едем30 — такси и попутчики",
    short_name: "Едем30",
    description:
      "Заказ такси и поиск попутчиков в Астрахани и Астраханской области.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ru",
    background_color: "#0b0b13",
    theme_color: "#7c3aed",
    categories: ["travel", "transportation"],
    prefer_related_applications: false,
    related_applications: [
      {
        platform: "play",
        id: "ru.edem30.twa",
        url: "https://www.rustore.ru/catalog/app/ru.edem30.twa",
      },
    ],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
