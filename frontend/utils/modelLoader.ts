// 3D model loader utilities for GLTF, OBJ, and URDF formats

export interface ModelMetadata {
  name: string;
  format: "gltf" | "glb" | "obj" | "urdf";
  vertices: number;
  faces: number;
  materials: number;
  size: number; // bytes
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface ModelData {
  metadata: ModelMetadata;
  geometry?: any; // Parsed geometry data
  materials?: any[]; // Material definitions
  textures?: any[]; // Texture data
  animations?: any[]; // Animation data
  urdfData?: URDFData; // URDF-specific data
}

export interface URDFData {
  links: URDFLink[];
  joints: URDFJoint[];
  rootLink: string;
}

export interface URDFLink {
  name: string;
  visual?: {
    geometry: {
      type: "box" | "cylinder" | "sphere" | "mesh";
      size?: number[];
      radius?: number;
      length?: number;
      filename?: string;
    };
    material?: {
      color?: { r: number; g: number; b: number; a: number };
      texture?: string;
    };
    origin?: { xyz: number[]; rpy: number[] };
  };
  collision?: {
    geometry: {
      type: "box" | "cylinder" | "sphere" | "mesh";
      size?: number[];
      radius?: number;
      length?: number;
      filename?: string;
    };
    origin?: { xyz: number[]; rpy: number[] };
  };
  inertial?: {
    mass: number;
    origin: { xyz: number[]; rpy: number[] };
    inertia: {
      ixx: number;
      ixy: number;
      ixz: number;
      iyy: number;
      iyz: number;
      izz: number;
    };
  };
}

export interface URDFJoint {
  name: string;
  type: "revolute" | "continuous" | "prismatic" | "fixed" | "floating" | "planar";
  parent: string;
  child: string;
  origin?: { xyz: number[]; rpy: number[] };
  axis?: { xyz: number[] };
  limit?: {
    lower: number;
    upper: number;
    effort: number;
    velocity: number;
  };
}

/**
 * Parse OBJ file content
 */
export const parseOBJ = (objContent: string): ModelData => {
  const lines = objContent.split("\n");
  const vertices: number[][] = [];
  const faces: number[][] = [];
  const normals: number[][] = [];
  const uvs: number[][] = [];
  let materialLib: string | null = null;
  let currentGroup = "default";
  const groups: { [key: string]: number[][] } = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split(/\s+/);
    const command = parts[0];

    switch (command) {
      case "v":
        // Vertex
        vertices.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        ]);
        break;
      case "vn":
        // Normal
        normals.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        ]);
        break;
      case "vt":
        // Texture coordinate
        uvs.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
        ]);
        break;
      case "f":
        // Face
        const faceIndices: number[] = [];
        for (let i = 1; i < parts.length; i++) {
          const indices = parts[i].split("/");
          faceIndices.push(parseInt(indices[0]) - 1); // OBJ is 1-indexed
        }
        faces.push(faceIndices);
        if (!groups[currentGroup]) {
          groups[currentGroup] = [];
        }
        groups[currentGroup].push(faceIndices);
        break;
      case "g":
        // Group
        currentGroup = parts[1] || "default";
        break;
      case "mtllib":
        // Material library
        materialLib = parts[1];
        break;
    }
  }

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  vertices.forEach((v) => {
    minX = Math.min(minX, v[0]);
    minY = Math.min(minY, v[1]);
    minZ = Math.min(minZ, v[2]);
    maxX = Math.max(maxX, v[0]);
    maxY = Math.max(maxY, v[1]);
    maxZ = Math.max(maxZ, v[2]);
  });

  return {
    metadata: {
      name: "Imported OBJ",
      format: "obj",
      vertices: vertices.length,
      faces: faces.length,
      materials: materialLib ? 1 : 0,
      size: objContent.length,
      boundingBox: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      },
    },
    geometry: {
      vertices,
      faces,
      normals,
      uvs,
      groups,
    },
  };
};

/**
 * Parse URDF file content (simplified parser)
 */
export const parseURDF = (urdfContent: string): ModelData => {
  // Simple XML parser for URDF
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(urdfContent, "text/xml");
  
  const links: URDFLink[] = [];
  const joints: URDFJoint[] = [];
  let rootLink: string | null = null;

  // Parse links
  const linkElements = xmlDoc.getElementsByTagName("link");
  for (let i = 0; i < linkElements.length; i++) {
    const linkEl = linkElements[i];
    const name = linkEl.getAttribute("name");
    if (!name) continue;

    const link: URDFLink = { name };

    // Visual
    const visualEl = linkEl.getElementsByTagName("visual")[0];
    if (visualEl) {
      const geometryEl = visualEl.getElementsByTagName("geometry")[0];
      const materialEl = visualEl.getElementsByTagName("material")[0];
      const originEl = visualEl.getElementsByTagName("origin")[0];

      if (geometryEl) {
        const boxEl = geometryEl.getElementsByTagName("box")[0];
        const cylinderEl = geometryEl.getElementsByTagName("cylinder")[0];
        const sphereEl = geometryEl.getElementsByTagName("sphere")[0];
        const meshEl = geometryEl.getElementsByTagName("mesh")[0];

        let geometry: any = {};
        if (boxEl) {
          const size = boxEl.getAttribute("size")?.split(" ").map(parseFloat) || [1, 1, 1];
          geometry = { type: "box", size };
        } else if (cylinderEl) {
          geometry = {
            type: "cylinder",
            radius: parseFloat(cylinderEl.getAttribute("radius") || "0.5"),
            length: parseFloat(cylinderEl.getAttribute("length") || "1"),
          };
        } else if (sphereEl) {
          geometry = {
            type: "sphere",
            radius: parseFloat(sphereEl.getAttribute("radius") || "0.5"),
          };
        } else if (meshEl) {
          geometry = {
            type: "mesh",
            filename: meshEl.getAttribute("filename") || "",
          };
        }

        link.visual = { geometry };

        if (materialEl) {
          const colorEl = materialEl.getElementsByTagName("color")[0];
          const textureEl = materialEl.getElementsByTagName("texture")[0];
          if (colorEl) {
            const rgba = colorEl.getAttribute("rgba")?.split(" ").map(parseFloat) || [1, 1, 1, 1];
            link.visual!.material = {
              color: { r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3] },
            };
          }
          if (textureEl) {
            link.visual!.material = {
              ...link.visual!.material,
              texture: textureEl.getAttribute("filename") || "",
            };
          }
        }

        if (originEl) {
          const xyz = originEl.getAttribute("xyz")?.split(" ").map(parseFloat) || [0, 0, 0];
          const rpy = originEl.getAttribute("rpy")?.split(" ").map(parseFloat) || [0, 0, 0];
          link.visual!.origin = { xyz, rpy };
        }
      }
    }

    // Collision
    const collisionEl = linkEl.getElementsByTagName("collision")[0];
    if (collisionEl) {
      const geometryEl = collisionEl.getElementsByTagName("geometry")[0];
      const originEl = collisionEl.getElementsByTagName("origin")[0];

      if (geometryEl) {
        const boxEl = geometryEl.getElementsByTagName("box")[0];
        const cylinderEl = geometryEl.getElementsByTagName("cylinder")[0];
        const sphereEl = geometryEl.getElementsByTagName("sphere")[0];
        const meshEl = geometryEl.getElementsByTagName("mesh")[0];

        let geometry: any = {};
        if (boxEl) {
          const size = boxEl.getAttribute("size")?.split(" ").map(parseFloat) || [1, 1, 1];
          geometry = { type: "box", size };
        } else if (cylinderEl) {
          geometry = {
            type: "cylinder",
            radius: parseFloat(cylinderEl.getAttribute("radius") || "0.5"),
            length: parseFloat(cylinderEl.getAttribute("length") || "1"),
          };
        } else if (sphereEl) {
          geometry = {
            type: "sphere",
            radius: parseFloat(sphereEl.getAttribute("radius") || "0.5"),
          };
        } else if (meshEl) {
          geometry = {
            type: "mesh",
            filename: meshEl.getAttribute("filename") || "",
          };
        }

        link.collision = { geometry };

        if (originEl) {
          const xyz = originEl.getAttribute("xyz")?.split(" ").map(parseFloat) || [0, 0, 0];
          const rpy = originEl.getAttribute("rpy")?.split(" ").map(parseFloat) || [0, 0, 0];
          link.collision!.origin = { xyz, rpy };
        }
      }
    }

    // Inertial
    const inertialEl = linkEl.getElementsByTagName("inertial")[0];
    if (inertialEl) {
      const massEl = inertialEl.getElementsByTagName("mass")[0];
      const originEl = inertialEl.getElementsByTagName("origin")[0];
      const inertiaEl = inertialEl.getElementsByTagName("inertia")[0];

      if (massEl && inertiaEl) {
        link.inertial = {
          mass: parseFloat(massEl.getAttribute("value") || "1"),
          origin: {
            xyz: originEl?.getAttribute("xyz")?.split(" ").map(parseFloat) || [0, 0, 0],
            rpy: originEl?.getAttribute("rpy")?.split(" ").map(parseFloat) || [0, 0, 0],
          },
          inertia: {
            ixx: parseFloat(inertiaEl.getAttribute("ixx") || "1"),
            ixy: parseFloat(inertiaEl.getAttribute("ixy") || "0"),
            ixz: parseFloat(inertiaEl.getAttribute("ixz") || "0"),
            iyy: parseFloat(inertiaEl.getAttribute("iyy") || "1"),
            iyz: parseFloat(inertiaEl.getAttribute("iyz") || "0"),
            izz: parseFloat(inertiaEl.getAttribute("izz") || "1"),
          },
        };
      }
    }

    links.push(link);
  }

  // Parse joints
  const jointElements = xmlDoc.getElementsByTagName("joint");
  for (let i = 0; i < jointElements.length; i++) {
    const jointEl = jointElements[i];
    const name = jointEl.getAttribute("name");
    const type = jointEl.getAttribute("type") || "fixed";
    const parentEl = jointEl.getElementsByTagName("parent")[0];
    const childEl = jointEl.getElementsByTagName("child")[0];
    const originEl = jointEl.getElementsByTagName("origin")[0];
    const axisEl = jointEl.getElementsByTagName("axis")[0];
    const limitEl = jointEl.getElementsByTagName("limit")[0];

    if (!name || !parentEl || !childEl) continue;

    const joint: URDFJoint = {
      name,
      type: type as URDFJoint["type"],
      parent: parentEl.getAttribute("link") || "",
      child: childEl.getAttribute("link") || "",
    };

    if (originEl) {
      joint.origin = {
        xyz: originEl.getAttribute("xyz")?.split(" ").map(parseFloat) || [0, 0, 0],
        rpy: originEl.getAttribute("rpy")?.split(" ").map(parseFloat) || [0, 0, 0],
      };
    }

    if (axisEl) {
      joint.axis = {
        xyz: axisEl.getAttribute("xyz")?.split(" ").map(parseFloat) || [1, 0, 0],
      };
    }

    if (limitEl) {
      joint.limit = {
        lower: parseFloat(limitEl.getAttribute("lower") || "0"),
        upper: parseFloat(limitEl.getAttribute("upper") || "0"),
        effort: parseFloat(limitEl.getAttribute("effort") || "0"),
        velocity: parseFloat(limitEl.getAttribute("velocity") || "0"),
      };
    }

    joints.push(joint);
  }

  // Find root link (link that is not a child of any joint)
  const childLinks = new Set(joints.map((j) => j.child));
  rootLink = links.find((l) => !childLinks.has(l.name))?.name || links[0]?.name || null;

  // Calculate bounding box from links
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  links.forEach((link) => {
    if (link.visual?.geometry) {
      const geom = link.visual.geometry;
      const origin = link.visual.origin?.xyz || [0, 0, 0];

      if (geom.type === "box" && geom.size) {
        const halfSize = geom.size.map((s) => s / 2);
        minX = Math.min(minX, origin[0] - halfSize[0]);
        minY = Math.min(minY, origin[1] - halfSize[1]);
        minZ = Math.min(minZ, origin[2] - halfSize[2]);
        maxX = Math.max(maxX, origin[0] + halfSize[0]);
        maxY = Math.max(maxY, origin[1] + halfSize[1]);
        maxZ = Math.max(maxZ, origin[2] + halfSize[2]);
      } else if (geom.type === "sphere" && geom.radius) {
        minX = Math.min(minX, origin[0] - geom.radius);
        minY = Math.min(minY, origin[1] - geom.radius);
        minZ = Math.min(minZ, origin[2] - geom.radius);
        maxX = Math.max(maxX, origin[0] + geom.radius);
        maxY = Math.max(maxY, origin[1] + geom.radius);
        maxZ = Math.max(maxZ, origin[2] + geom.radius);
      } else if (geom.type === "cylinder" && geom.radius && geom.length) {
        const halfLength = geom.length / 2;
        minX = Math.min(minX, origin[0] - geom.radius);
        minY = Math.min(minY, origin[1] - halfLength);
        minZ = Math.min(minZ, origin[2] - geom.radius);
        maxX = Math.max(maxX, origin[0] + geom.radius);
        maxY = Math.max(maxY, origin[1] + halfLength);
        maxZ = Math.max(maxZ, origin[2] + geom.radius);
      }
    }
  });

  return {
    metadata: {
      name: "Imported URDF",
      format: "urdf",
      vertices: 0, // URDF doesn't have explicit vertex count
      faces: links.length,
      materials: links.filter((l) => l.visual?.material).length,
      size: urdfContent.length,
      boundingBox: {
        min: { x: minX === Infinity ? -1 : minX, y: minY === Infinity ? -1 : minY, z: minZ === Infinity ? -1 : minZ },
        max: { x: maxX === -Infinity ? 1 : maxX, y: maxY === -Infinity ? 1 : maxY, z: maxZ === -Infinity ? 1 : maxZ },
      },
    },
    urdfData: {
      links,
      joints,
      rootLink: rootLink || "",
    },
  };
};

/**
 * Load model from file
 */
export const loadModelFromFile = async (file: File): Promise<ModelData> => {
  const content = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "obj":
      return parseOBJ(content);
    case "urdf":
    case "xml":
      return parseURDF(content);
    case "gltf":
    case "glb":
      // GLTF/GLB parsing would require a library like three.js or gltf-transform
      // For now, return a placeholder
      return {
        metadata: {
          name: file.name,
          format: extension === "glb" ? "glb" : "gltf",
          vertices: 0,
          faces: 0,
          materials: 0,
          size: file.size,
          boundingBox: {
            min: { x: -1, y: -1, z: -1 },
            max: { x: 1, y: 1, z: 1 },
          },
        },
      };
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
};

/**
 * Generate preview data for visualization
 */
export const generateModelPreview = (modelData: ModelData): {
  vertices: Float32Array;
  indices: Uint16Array;
  colors: Float32Array;
} => {
  if (modelData.format === "urdf" && modelData.urdfData) {
    // Generate preview geometry from URDF
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    let indexOffset = 0;

    modelData.urdfData.links.forEach((link) => {
      if (link.visual?.geometry) {
        const geom = link.visual.geometry;
        const origin = link.visual.origin?.xyz || [0, 0, 0];
        const color = link.visual.material?.color || { r: 0.8, g: 0.8, b: 0.8, a: 1 };

        if (geom.type === "box" && geom.size) {
          const [w, h, d] = geom.size;
          const [x, y, z] = origin;
          const [r, g, b] = [color.r, color.g, color.b];

          // Box vertices (8 vertices)
          const boxVertices = [
            x - w/2, y - h/2, z - d/2, // 0
            x + w/2, y - h/2, z - d/2, // 1
            x + w/2, y + h/2, z - d/2, // 2
            x - w/2, y + h/2, z - d/2, // 3
            x - w/2, y - h/2, z + d/2, // 4
            x + w/2, y - h/2, z + d/2, // 5
            x + w/2, y + h/2, z + d/2, // 6
            x - w/2, y + h/2, z + d/2, // 7
          ];

          vertices.push(...boxVertices);

          // Box faces (12 triangles)
          const boxIndices = [
            0, 1, 2, 0, 2, 3, // front
            4, 7, 6, 4, 6, 5, // back
            0, 4, 5, 0, 5, 1, // bottom
            2, 6, 7, 2, 7, 3, // top
            0, 3, 7, 0, 7, 4, // left
            1, 5, 6, 1, 6, 2, // right
          ];

          indices.push(...boxIndices.map((i) => i + indexOffset));
          indexOffset += 8;

          // Colors for each vertex
          for (let i = 0; i < 8; i++) {
            colors.push(r, g, b);
          }
        } else if (geom.type === "sphere" && geom.radius) {
          // Generate sphere vertices (simplified, 32 segments)
          const [x, y, z] = origin;
          const radius = geom.radius;
          const [r, g, b] = [color.r, color.g, color.b];
          const segments = 16;

          for (let i = 0; i <= segments; i++) {
            const theta = (i * Math.PI) / segments;
            for (let j = 0; j <= segments; j++) {
              const phi = (j * 2 * Math.PI) / segments;
              const vx = x + radius * Math.sin(theta) * Math.cos(phi);
              const vy = y + radius * Math.cos(theta);
              const vz = z + radius * Math.sin(theta) * Math.sin(phi);
              vertices.push(vx, vy, vz);
              colors.push(r, g, b);
            }
          }

          // Sphere indices
          for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
              const a = indexOffset + i * (segments + 1) + j;
              const b = indexOffset + (i + 1) * (segments + 1) + j;
              indices.push(a, b, a + 1);
              indices.push(b, b + 1, a + 1);
            }
          }

          indexOffset += (segments + 1) * (segments + 1);
        } else if (geom.type === "cylinder" && geom.radius && geom.length) {
          // Generate cylinder vertices
          const [x, y, z] = origin;
          const radius = geom.radius;
          const length = geom.length;
          const [r, g, b] = [color.r, color.g, color.b];
          const segments = 16;

          // Top and bottom circles
          for (let i = 0; i < segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const cx = Math.cos(angle) * radius;
            const cz = Math.sin(angle) * radius;

            // Bottom vertex
            vertices.push(x + cx, y - length/2, z + cz);
            colors.push(r, g, b);
            // Top vertex
            vertices.push(x + cx, y + length/2, z + cz);
            colors.push(r, g, b);
          }

          // Cylinder indices
          for (let i = 0; i < segments; i++) {
            const base = indexOffset + i * 2;
            const next = indexOffset + ((i + 1) % segments) * 2;
            // Side faces
            indices.push(base, base + 1, next);
            indices.push(next, base + 1, next + 1);
            // Bottom cap
            indices.push(indexOffset, next, base);
            // Top cap
            indices.push(indexOffset + 1, base + 1, next + 1);
          }

          indexOffset += segments * 2;
        }
      }
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      colors: new Float32Array(colors),
    };
  } else if (modelData.geometry) {
    // OBJ geometry
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    modelData.geometry.vertices.forEach((v) => {
      vertices.push(v[0], v[1], v[2]);
      colors.push(0.8, 0.8, 0.8); // Default gray
    });

    modelData.geometry.faces.forEach((face) => {
      if (face.length >= 3) {
        indices.push(face[0], face[1], face[2]);
        if (face.length === 4) {
          indices.push(face[0], face[2], face[3]);
        }
      }
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      colors: new Float32Array(colors),
    };
  }

  // Fallback
  return {
    vertices: new Float32Array([]),
    indices: new Uint16Array([]),
    colors: new Float32Array([]),
  };
};

