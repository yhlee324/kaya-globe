"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Color, Scene, Fog, PerspectiveCamera, Vector3 } from "three";
import ThreeGlobe from "three-globe";
import { useThree, Object3DNode, Canvas, extend, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "../data/globe.json";
import { CSS2DRenderer } from "three/examples/jsm/Addons.js";
import contractorData from "../data/contractorData.json";
declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, typeof ThreeGlobe>;
  }
} extend({ ThreeGlobe });

const factorySvg ='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-factory"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>';
const buildingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`;
const dropDownSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>'
//Coordinates and other details for each contractor
const points = contractorData.map(contractor => ({
  lat: contractor.latitude,
  lng: contractor.longitude,
  name: contractor.contractor_name,
  color: contractor.color,
  position: new THREE.Vector3(),
  elem: null as HTMLElement | null,
}));

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

const fov = 50;
const aspect = 2;
const near = 0.1;
const far = 1000;

/**
 * Tooltip function to show tooltip on hover
 */
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.style.position = 'absolute';
tooltip.style.display = 'none';
tooltip.style.backgroundColor = 'rgba(24, 24, 27, 0.75)';
tooltip.style.color = 'white';
tooltip.style.padding = '5px';
tooltip.style.borderRadius = '3px';
tooltip.style.pointerEvents = 'auto';
document.body.appendChild(tooltip);

function showTooltip(d: any, event: MouseEvent) {
  const tooltip = document.getElementById('tooltip');    
  if (!tooltip) return;
  tooltip.style.display = 'block';
  tooltip.innerHTML = 
`
<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
  <div style="flex-shrink: 0; padding: 5px; margin-right: 5px; color: ${d.color}">${buildingSvg}</div>
  <div id="content" style="flex-grow: 1;">
    <div style="font-size: 10px;">Name</div>
    ${d.name}
    <div style="font-size: 8px;">3 pcs</div>
  </div>
  <button style="flex-shrink: 0; padding: 5px 10px;">${dropDownSvg}</button>
</div>
`;
  tooltip.style.borderLeft = `${d.color} solid 2px`;
  tooltip.style.left = event.pageX + 'px';
  tooltip.style.top = event.pageY + 'px';
}

function hideTooltip() {
  const tooltip = document.getElementById('tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}


/**
 * Updates the visibility of the html elements on the globe. This function is necessary as 
 * the html elements are rendered by css2drenderer, which is not part of the threejs scene.
 * 
 */
const updateObjVisibility = (globalPov: THREE.Vector3, globePos: THREE.Vector3) => {
  if (globalPov) {
    const globeRadius = 100;
    const pov = globePos ? globalPov.clone().sub(globePos) : globalPov.clone();

     const povDist = pov.length();
    const maxSurfacePosAngle = Math.acos(globeRadius / povDist);

    for (const point of points) {
      const {position, elem} = point;
      if (!elem) continue; 

      const isVisible = pov.angleTo(position) <= maxSurfacePosAngle;
      const currentVisibility = elem.style.visibility !== 'hidden';

      // Update the DOM only if there's a change in visibility status
      if (isVisible !== currentVisibility) {
        elem.style.visibility = isVisible ? '' : 'hidden';
      }
    }
  }
}

/**
 * The Globe Component
 */
export function Globe({ globeConfig, data }: WorldProps) {
  const [globeData, setGlobeData] = useState<
    | {
        size: number;
        order: number;
        color: (t: number) => string;
        lat: number;
        lng: number;
      }[]
    | null
  >(null);

  const globeRef = useRef<ThreeGlobe | null>(null);

  //Get position of the camera
  const { camera } = useThree();
  const cameraPosition = camera.position;
  const previousCameraPosition = useRef(new THREE.Vector3());

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  useEffect(() => {
    if (globeRef.current) {
      _buildData();
      _buildMaterial();
    }
  }, [globeRef.current]);

  const _buildMaterial = () => {
    if (!globeRef.current) return;

    const globeMaterial = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    globeMaterial.color = new Color(globeConfig.globeColor);
    globeMaterial.emissive = new Color(globeConfig.emissive);
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
    globeMaterial.shininess = globeConfig.shininess || 0.9;
  };

  const _buildData = () => {
    const arcs = data;
    let points = [];
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const rgb = hexToRgb(arc.color) as { r: number; g: number; b: number };
      points.push({ 
        size: defaultProps.pointSize,
        order: arc.order,
        color: (t: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - t})`,
        lat: arc.startLat,
        lng: arc.startLng,
      });
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: (t: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - t})`,
        lat: arc.endLat,
        lng: arc.endLng,
      });
    }

    // remove duplicates for same lat and lng
    const filteredPoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          ["lat", "lng"].every(
            (k) => v2[k as "lat" | "lng"] === v[k as "lat" | "lng"]
          )
        ) === i
    );

    setGlobeData(filteredPoints);
  };

  //Functions to compute positions of the html elements
  const parsePointData = () => {
    for (const point of points) {
      point.position = polar2Cartesian(point.lat, point.lng);
    }
  }
  
  const polar2Cartesian = (lat: number, lng: number, relAltitude = 0) => {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (90 - lng) * Math.PI / 180;
    const r = 100 * (1 + relAltitude);
    return new THREE.Vector3 (
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  useEffect(() => {
    if (globeRef.current && globeData) {
      globeRef.current
        .hexPolygonsData(countries.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.7)
        .showAtmosphere(defaultProps.showAtmosphere)
        .atmosphereColor(defaultProps.atmosphereColor)
        .atmosphereAltitude(defaultProps.atmosphereAltitude)
        .hexPolygonColor(() => {
          return defaultProps.polygonColor;
        });
      startAnimation();

      if (globeRef.current && camera.position) {
        updateObjVisibility(camera.position, globeRef.current.position);
      }
    }
  }, [globeData]);

  //Updates object visibility
  useFrame(() => {
    const currentCameraPosition = camera.position;
    if (!previousCameraPosition.current.equals(currentCameraPosition)) {
      updateObjVisibility(currentCameraPosition, globeRef.current?.position ?? new THREE.Vector3());
      previousCameraPosition.current.copy(currentCameraPosition);
    }
  });

  /**
   * The animation component of the globe
   * 
   */
  const startAnimation = () => {
    if (!globeRef.current || !globeData) return;

    globeRef.current
      .htmlElementsData(points)
      .htmlElement((d:any) => {
        const element = document.createElement('div');
        element.innerHTML = factorySvg;
        element.style.color = d.color;
        element.style.width = `3px`;
        element.style.pointerEvents = 'auto';
        element.addEventListener('mouseover', (event) => showTooltip(d, event));
        element.addEventListener('mouseout', hideTooltip);
        d.elem = element;
        return element;
      });

    parsePointData();

    // Configuration for arcs
    globeRef.current
      .arcsData(data)
      .arcColor(() => "#ffcb21")
      .arcDashLength(0.8)
      .arcDashInitialGap((e) => (e as { order: number }).order * 1)
      .arcDashGap(4)
      .arcDashAnimateTime(1000);
  };

  return (
    <>
      <threeGlobe ref={globeRef} />
    </>
  );
}

//Renders WebGL components (globe, arcs, rings)
export function WebGLRendererConfig() {
  
  const { gl, size } = useThree();

  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0xffaaff, 0);
  }, []);

  return null;
}

//Function to render css2d components (html elements on globe)
export function CSS2DRendererComponent() {
  const { scene, camera, size } = useThree();
  const css2dRendererRef = useRef<CSS2DRenderer>();

  useEffect(() => {
    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.setSize(size.width, size.height);
    css2dRenderer.domElement.style.position = 'absolute';
    css2dRenderer.domElement.style.top = '0px';
    css2dRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(css2dRenderer.domElement);
    
    css2dRendererRef.current = css2dRenderer;
    return () => {
      document.body.removeChild(css2dRenderer.domElement);
    };
  }, [size]);

  useFrame(() => {
    if (css2dRendererRef.current) {
      css2dRendererRef.current.render(scene, camera);
    }
  });

  return null;
}

export function World(props: WorldProps) {
  const { globeConfig } = props;
  const scene = new Scene();
  scene.fog = new Fog(0xffffff, 400, 2000);
  return (
    <Canvas scene={scene} camera={new PerspectiveCamera(fov, aspect, near, far)}>
      <WebGLRendererConfig />
      <CSS2DRendererComponent />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={200}
        maxDistance={350}
        autoRotateSpeed={1}
        autoRotate={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}

export function hexToRgb(hex: string) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function genRandomNumbers(min: number, max: number, count: number) {
  const arr = [];
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min)) + min;
    if (arr.indexOf(r) === -1) arr.push(r);
  }

  return arr;
}
