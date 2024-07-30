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
    initialPosition: { lat: 0, lng: 0 },
    autoRotate: false,
    autoRotateSpeed: 0.5,
  };
  const sampleArcs = [
    {
      //Beijing to contractor 
      order: 1,
      startLat: 39.904211,
      startLng: 116.407395,
      endLat: 39.0121002,
      endLng: -94.19420199999999,
      arcAlt: 0.3,
      color: "#06b6d4",
    },
    {
      //Kiev to contractor
      order: 1,
      startLat: 50.4503,
      startLng: 30.52450,
      endLat: 39.0121002,
      endLng: -94.19420199999999,
      arcAlt: 0.2,
      color: "#06b6d4",
    },
    {
    //Mexico City to contractor
      order: 1,
      startLat: 19.432608,
      startLng: -99.133208,
      endLat: 39.0121002,
      endLng: -94.19420199999999,
      arcAlt: 0.2,
      color: "#06b6d4",
    },
    {
      //From contractor to 421 Park Street
      order: 2,
      startLat: 39.0121002,
      startLng: -94.19420199999999,
      endLat: 42.296026,
      endLng: -71.071539,
      arcAlt: 0.2,
      color: "green",
    },

  ];

  return (
    <div className="flex items-center justify-center py-20 h-screen bg-black relative w-full">
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
        <div className="relative justify-center" style={{ width: '100vw', height: '100vh'}}>
          <World data={sampleArcs} globeConfig={globeConfig} />
        </div>
    </div>
  );
}
