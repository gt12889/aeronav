// USD (Universal Scene Description) exporter for Omniverse integration

export interface USDSceneData {
  spaceship: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  };
  particles: Array<{
    position: { x: number; y: number; z: number };
    size: number;
    type: string;
  }>;
  nebula: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    color: { r: number; g: number; b: number; a: number };
  }>;
  environment: {
    gridSize: number;
    bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  };
  metadata: {
    timestamp: string;
    version: string;
    frame: number;
  };
}

/**
 * Generate USD file content from scene data
 */
export const generateUSD = (sceneData: USDSceneData): string => {
  const { spaceship, particles, nebula, environment, metadata } = sceneData;
  
  let usd = `#usda 1.0
(
    doc = """AeroNavSim Scene Export"""
    defaultPrim = "World"
    endTimeCode = ${metadata.frame}
    startTimeCode = ${metadata.frame}
    timeCodesPerSecond = 60
    upAxis = "Y"
    customLayerData = {
        string version = "${metadata.version}"
        string timestamp = "${metadata.timestamp}"
    }
)

def Xform "World" (
    kind = "component"
)
{
    double3 xformOp:translate = (0, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]
    
    # Spaceship
    def Xform "Spaceship" (
        kind = "component"
    )
    {
        double3 xformOp:translate = (${spaceship.position.x}, ${spaceship.position.y}, ${spaceship.position.z})
        double3 xformOp:rotateXYZ = (${spaceship.rotation.x * 57.2958}, ${spaceship.rotation.y * 57.2958}, ${spaceship.rotation.z * 57.2958})
        double3 xformOp:scale = (${spaceship.scale.x}, ${spaceship.scale.y}, ${spaceship.scale.z})
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]
        
        # Velocity attribute
        float3 velocity = (${spaceship.velocity.x}, ${spaceship.velocity.y}, ${spaceship.velocity.z})
        
        # Mesh definition (simplified spaceship geometry)
        def Mesh "SpaceshipMesh"
        {
            point3f[] points = [
                (0, -0.3, 0),      # Nose
                (0.1, 0, 0),       # Right front
                (0.15, 0.25, 0),  # Right engine mount
                (0.05, 0.2, 0),   # Rear center right
                (-0.05, 0.2, 0),  # Rear center left
                (-0.15, 0.25, 0), # Left engine mount
                (-0.1, 0, 0),     # Left front
            ]
            int[] faceVertexIndices = [
                0, 1, 2, 3, 4, 5, 6, 0
            ]
            int[] faceVertexCounts = [7]
            normal3f[] normals = [
                (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)
            ]
            
            # Material
            rel material:binding = </World/Materials/SpaceshipMaterial>
        }
        
        # Wings
        def Mesh "LeftWing"
        {
            point3f[] points = [
                (-0.1, 0, 0),
                (-0.4, 0.15, 0),
                (-0.15, 0.2, 0),
            ]
            int[] faceVertexIndices = [0, 1, 2]
            int[] faceVertexCounts = [3]
            rel material:binding = </World/Materials/WingMaterial>
        }
        
        def Mesh "RightWing"
        {
            point3f[] points = [
                (0.1, 0, 0),
                (0.4, 0.15, 0),
                (0.15, 0.2, 0),
            ]
            int[] faceVertexIndices = [0, 1, 2]
            int[] faceVertexCounts = [3]
            rel material:binding = </World/Materials/WingMaterial>
        }
    }
    
    # Particles
    def Xform "Particles" (
        kind = "component"
    )
    {
`;

  // Add particles
  particles.forEach((particle, index) => {
    usd += `        def Xform "Particle_${index}" (
            kind = "component"
        )
        {
            double3 xformOp:translate = (${particle.position.x}, ${particle.position.y}, ${particle.position.z})
            double3 xformOp:scale = (${particle.size}, ${particle.size}, ${particle.size})
            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:scale"]
            
            def Sphere "ParticleSphere"
            {
                double radius = ${particle.size * 0.1}
                rel material:binding = </World/Materials/ParticleMaterial>
            }
        }
`;
  });

  usd += `    }
    
    # Nebula Clouds
    def Xform "Nebula" (
        kind = "component"
    )
    {
`;

  // Add nebula clouds
  nebula.forEach((cloud, index) => {
    usd += `        def Xform "Nebula_${index}" (
            kind = "component"
        )
        {
            double3 xformOp:translate = (${cloud.position.x}, ${cloud.position.y}, ${cloud.position.z})
            uniform token[] xformOpOrder = ["xformOp:translate"]
            
            def Sphere "NebulaSphere"
            {
                double radius = ${cloud.radius}
                rel material:binding = </World/Materials/NebulaMaterial_${index}>
            }
        }
`;
  });

  usd += `    }
    
    # Environment Grid
    def Xform "Grid" (
        kind = "component"
    )
    {
        double3 xformOp:scale = (${environment.gridSize}, ${environment.gridSize}, ${environment.gridSize})
        uniform token[] xformOpOrder = ["xformOp:scale"]
        
        def Mesh "GridMesh"
        {
            point3f[] points = [
                (${environment.bounds.min.x}, ${environment.bounds.min.y}, ${environment.bounds.min.z}),
                (${environment.bounds.max.x}, ${environment.bounds.min.y}, ${environment.bounds.min.z}),
                (${environment.bounds.max.x}, ${environment.bounds.max.y}, ${environment.bounds.min.z}),
                (${environment.bounds.min.x}, ${environment.bounds.max.y}, ${environment.bounds.min.z}),
            ]
            int[] faceVertexIndices = [0, 1, 2, 3]
            int[] faceVertexCounts = [4]
            rel material:binding = </World/Materials/GridMaterial>
        }
    }
    
    # Materials
    def Scope "Materials"
    {
        def Material "SpaceshipMaterial"
        {
            token outputs:surface.connect = </World/Materials/SpaceshipMaterial/Surface.outputs:surface>
            
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.9, 0.9, 0.95)
                float inputs:metallic = 0.8
                float inputs:roughness = 0.2
                token outputs:surface
            }
        }
        
        def Material "WingMaterial"
        {
            token outputs:surface.connect = </World/Materials/WingMaterial/Surface.outputs:surface>
            
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.1, 0.1, 0.15)
                float inputs:metallic = 0.9
                float inputs:roughness = 0.1
                token outputs:surface
            }
        }
        
        def Material "ParticleMaterial"
        {
            token outputs:surface.connect = </World/Materials/ParticleMaterial/Surface.outputs:surface>
            
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.5, 0.7, 1.0)
                float inputs:emissiveColor = (0.3, 0.5, 0.8)
                float inputs:metallic = 0.0
                float inputs:roughness = 0.5
                token outputs:surface
            }
        }
`;

  // Add nebula materials
  nebula.forEach((cloud, index) => {
    usd += `        def Material "NebulaMaterial_${index}"
        {
            token outputs:surface.connect = </World/Materials/NebulaMaterial_${index}/Surface.outputs:surface>
            
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b})
                float inputs:emissiveColor = (${cloud.color.r * 0.5}, ${cloud.color.g * 0.5}, ${cloud.color.b * 0.5})
                float inputs:metallic = 0.0
                float inputs:roughness = 1.0
                float inputs:opacity = ${cloud.color.a}
                token outputs:surface
            }
        }
`;
  });

  usd += `        def Material "GridMaterial"
        {
            token outputs:surface.connect = </World/Materials/GridMaterial/Surface.outputs:surface>
            
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.2, 0.3, 0.4)
                float inputs:metallic = 0.0
                float inputs:roughness = 0.8
                float inputs:opacity = 0.1
                token outputs:surface
            }
        }
    }
}
`;

  return usd;
};

/**
 * Convert HSL to RGB
 */
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return { r, g, b };
};

/**
 * Export scene data to USD format
 */
export const exportSceneToUSD = (
  spaceshipData: USDSceneData["spaceship"],
  particles: USDSceneData["particles"],
  nebula: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    color: { r: number; g: number; b: number; a: number };
  }>,
  environment: USDSceneData["environment"],
  frame: number = 0
): string => {
  const sceneData: USDSceneData = {
    spaceship: spaceshipData,
    particles,
    nebula,
    environment,
    metadata: {
      timestamp: new Date().toISOString(),
      version: "3.4",
      frame,
    },
  };
  
  return generateUSD(sceneData);
};

/**
 * Download USD file
 */
export const downloadUSD = (usdContent: string, filename: string = "aeronavsim_scene.usd"): void => {
  const blob = new Blob([usdContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

