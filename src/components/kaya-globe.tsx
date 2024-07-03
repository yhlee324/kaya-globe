"use client";
import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const World = dynamic(() => import("./ui/globe").then((m) => m.World), {
  ssr: false,
});

export function KayaGlobe() {
  const globeConfig = {
    pointSize: 8,
    globeColor: "#0c5606",
    showAtmosphere: true,
    atmosphereColor: "#FFFFFF",
    atmosphereAltitude: 0.1,
    emissive: "#062056",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    polygonColor: "rgba(255,255,255,0.7)",
    ambientLight: "#38bdf8",
    directionalLeftLight: "#ffffff",
    directionalTopLight: "#ffffff",
    pointLight: "#ffffff",
    rings: 1,
    maxRings: 10,
    initialPosition: { lat: 22.3193, lng: 114.1694 },
    autoRotate: true,
    autoRotateSpeed: 0.5,
  };
  const colors = ["#06b6d4", "#3b82f6", "#6366f1"];
  const sampleArcs = [
    {
        startLat: -19.885592,
        startLng: -43.951191,
        endLat: 42.345290,
        endLng: -71.103850,
        arcAlt: 0.3,
        color: "#06b6d4",
    },
    {
        startLat: 28.6139,
        startLng: 30.209,
        endLat: 42.345290,
        endLng: -71.103850,
        arcAlt: 0.2,
        color: "#06b6d4",
    },
    {
        startLat: 19.885592,
        startLng: 43.951191,
        endLat: 42.345290,
        endLng: -71.103850,
        arcAlt: 0.5,
        color: colors[Math.floor(Math.random() * (colors.length - 1))],
    },
    {
        startLat: 50.885592,
        startLng: 70.951,
        endLat: 42.345290,
        endLng: -71.103850,
        arcAlt: 0.5,
        color: colors[Math.floor(Math.random() * (colors.length - 1))],
    },
  ];

  return (
<div className="flex items-center justify-center py-20 h-screen bg-white dark:bg-black relative w-full">
    <div className="max-w-7xl mx-auto w-full relative overflow-hidden h-full md:h-[40rem] px-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 1,
          }}
          className="div"
        >
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: '700px', height: '700px' }}>
            <World data={sampleArcs} globeConfig={globeConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
