"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Color, Scene, Fog, PerspectiveCamera, Vector3 } from "three";
import ThreeGlobe from "three-globe";
import { useThree, Object3DNode, Canvas, extend, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "../data/globe.json";
import { CSS2DRenderer } from "three/examples/jsm/Addons.js";
import contractorData from "../data/pointData.json";
declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, typeof ThreeGlobe>;
  }
}

extend({ ThreeGlobe });

const fov = 50;
const aspect = 1.2;
const near = 0.1;
const far = 1000;
const camera = new PerspectiveCamera(fov, aspect, near, far);

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

/**
 * Tooltip function to show tooltip on hover
 */
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.style.position = 'absolute';
tooltip.style.display = 'none';
tooltip.style.background = 'black';
tooltip.style.border = '1px solid black';
tooltip.style.color = 'white';
tooltip.style.padding = '5px';
tooltip.style.borderRadius = '3px';
tooltip.style.pointerEvents = 'none';
document.body.appendChild(tooltip);

function showTooltip(d: any, event: MouseEvent) {
  const tooltip = document.getElementById('tooltip');    
  if (!tooltip) {
    return;
  }
  tooltip.style.display = 'block';
  tooltip.innerHTML = d.name;
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

  const [camera, setCamera] = useState<PerspectiveCamera | undefined>();

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
    }
  }, [globeData]);

  //Initialize variables for "updateLabels"
  const tempV = new THREE.Vector3();
  const cameraToPoint = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const settings = {
    minArea: 20,
    maxVisibleDot: -0.2,
  };

  /**
   * Function to update html elements' visibility based on camera orientation. 
   * This function is necessary as the html elements are not part of the WebGL scene.
   * All credits to Jonathan P Christie, from https://gist.github.com/mathcodes/758a5699482b22a13d762c614acd1bb3
   */
  // const updateLabels = () => {
  //   if (!camera) return;
  //   loadContractorData();
  //   // get a matrix that represents a relative orientation of the camera
  //   normalMatrix.getNormalMatrix(camera.matrixWorldInverse);
  //   // get the camera's position
  //   camera.getWorldPosition(cameraPosition);
  //   for (const contractor : contractorData) {
  //     // Orient the position based on the camera's orientation.
  //     // Since the sphere is at the origin and the sphere is a unit sphere
  //     // this gives us a camera relative direction vector for the position.
  //     tempV.copy(position);
  //     tempV.applyMatrix3(normalMatrix);

  //     // compute the direction to this position from the camera
  //     cameraToPoint.copy(position);
  //     cameraToPoint.applyMatrix4(camera.matrixWorldInverse).normalize();

  //     // get the dot product of camera relative direction to this position
  //     // on the globe with the direction from the camera to that point.
  //     // -1 = facing directly towards the camera
  //     // 0 = exactly on tangent of the sphere from the camera
  //     // > 0 = facing away
  //     const dot = tempV.dot(cameraToPoint);

  //     // if the orientation is not facing us hide it.
  //     if (dot > settings.maxVisibleDot) {
  //       elem.style.display = 'none';
  //       continue;
  //     }

  //     // restore the element to its default display style
  //     elem.style.display = '';

  //     // get the normalized screen coordinate of that position
  //     // x and y will be in the -1 to +1 range with x = -1 being
  //     // on the left and y = -1 being on the bottom
  //     tempV.copy(position);
  //     tempV.project(camera);

  //     // convert the normalized position to CSS coordinates
  //     const x = (tempV.x *  .5 + .5) * canvas.clientWidth;
  //     const y = (tempV.y * -.5 + .5) * canvas.clientHeight;

  //     // move the elem to that position
  //     elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;

  //     // set the zIndex for sorting
  //     elem.style.zIndex = (-tempV.z * .5 + .5) * 100000 | 0;
  //   }
  // };

  const startAnimation = () => {
    if (!globeRef.current || !globeData) return;

    //Configuration for html elements
    const points = contractorData.map(contractor => ({
      lat: contractor.latitude,
      lng: contractor.longitude,
      name: contractor.contractor_name,
      color: contractor.color,
      position: new THREE.Vector3(),
    }));
    const lonFudge = Math.PI * 1.5;
    const latFudge = Math.PI;
    // these helpers will make it easy to position the boxes
    // We can rotate the lon helper on its Y axis to the longitude
    const lonHelper = new THREE.Object3D();
    // We rotate the latHelper on its X axis to the latitude
    const latHelper = new THREE.Object3D();
    lonHelper.add(latHelper);
    // The position helper moves the object to the edge of the sphere
    const positionHelper = new THREE.Object3D();
    positionHelper.position.z = 1;
    latHelper.add(positionHelper);

    for (const point of points) {
      lonHelper.rotation.y = THREE.MathUtils.degToRad(point.lng) + lonFudge;
      latHelper.rotation.x = THREE.MathUtils.degToRad(point.lat) + latFudge;
      positionHelper.updateWorldMatrix(true, false);
      const position = new THREE.Vector3();
      positionHelper.getWorldPosition(position);
      point.position = position;
    }
    const factorySvg ='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-factory"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>';

    globeRef.current
      .htmlElementsData(points)
      .htmlElement((d:any) => {
        const element = document.createElement('div');
        element.innerHTML = factorySvg;
        element.style.color = d.color;
        element.style.width = `${d.size}px`;
        element.style.pointerEvents = 'auto';
        element.addEventListener('mouseover', (event) => showTooltip(d, event));
        element.addEventListener('mouseout', hideTooltip);
        return element;
      });

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
    <Canvas scene={scene} camera={camera}>
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
