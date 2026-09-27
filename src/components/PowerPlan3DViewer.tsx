import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FloorplanConfig, PowerPlanConfig } from '../types/physicalDesign';
import { ErrorBoundary } from './ErrorBoundary';
import {
    Layers,
    RotateCw,
    Maximize2,
    Zap,
    Eye,
    EyeOff,
    Sliders,
    Info,
    CheckCircle2,
    Activity,
    Play,
    Pause,
    Box,
    Compass,
    ArrowUp,
    Camera,
    Sparkles
} from 'lucide-react';

interface PowerPlan3DViewerProps {
    floorplan: FloorplanConfig;
    powerPlan: PowerPlanConfig;
    selectedElement?: any;
    onSelectElement?: (element: any) => void;
    onSwitchTo2D?: () => void;
}

// Camera controller helper
function CameraController({ cameraPreset }: { cameraPreset: 'iso' | 'top' | 'side' | 'exploded' }) {
    const { camera } = useThree();

    React.useEffect(() => {
        if (cameraPreset === 'iso') {
            camera.position.set(9, 8, 9);
            camera.lookAt(0, 1, 0);
        } else if (cameraPreset === 'top') {
            camera.position.set(0, 14, 0.01);
            camera.lookAt(0, 0, 0);
        } else if (cameraPreset === 'side') {
            camera.position.set(13, 1.5, 0);
            camera.lookAt(0, 1.5, 0);
        } else if (cameraPreset === 'exploded') {
            camera.position.set(10, 6, 8);
            camera.lookAt(0, 2, 0);
        }
    }, [cameraPreset, camera]);

    return null;
}

// --- 3D Mesh Component for the Power Distribution Network (PDN) ---
function PDN3DScene({
    floorplan,
    powerPlan,
    layerExplode,
    netFilter,
    animateFlow,
    onHoverElement,
    selectedElement,
    onSelectElement
}: {
    floorplan: FloorplanConfig;
    powerPlan: PowerPlanConfig;
    layerExplode: number;
    netFilter: 'ALL' | 'VDD' | 'VSS';
    animateFlow: boolean;
    onHoverElement: (info: any) => void;
    selectedElement: any;
    onSelectElement?: (element: any) => void;
}) {
    const flowGroupRef = useRef<THREE.Group>(null);

    // Scaled coordinates for 3D world space (100 µm = 1 unit)
    const scale = 0.01;
    const dieW = floorplan.dieWidth * scale;
    const dieH = floorplan.dieHeight * scale;
    const coreW = (floorplan.dieWidth - floorplan.coreMarginLeft - floorplan.coreMarginRight) * scale;
    const coreH = (floorplan.dieHeight - floorplan.coreMarginTop - floorplan.coreMarginBottom) * scale;
    const coreX0 = -dieW / 2 + floorplan.coreMarginLeft * scale;
    const coreY0 = -dieH / 2 + floorplan.coreMarginTop * scale;

    // Layer elevation offsets (scaled by layerExplode slider)
    const zSubstrate = 0;
    const zM1 = 0.35 * layerExplode;
    const zVias = 0.8 * layerExplode;
    const zM5 = 1.35 * layerExplode;
    const zM6 = 2.1 * layerExplode;
    const zM7Trunk = 2.9 * layerExplode;
    const zPads = 3.6 * layerExplode;

    // Color Palette matching EDA layout
    const colorVDD = '#ef4444'; // Red
    const colorVSS = '#06b6d4'; // Cyan
    const colorVStrap = '#22c55e'; // Green (as in Cadence/Synopsys image)
    const colorHStrap = '#ef4444'; // Red/Orange
    const colorVia = '#facc15'; // Gold
    const colorSubstrate = '#0f172a'; // Deep slate
    const colorCore = '#1e293b';

    // Selection detection helper
    const isSelected = (keyword: string) => {
        if (!selectedElement || !selectedElement.name) return false;
        return selectedElement.name.toUpperCase().includes(keyword.toUpperCase());
    };

    // Calculate strap positions
    const numVStraps = Math.max(3, Math.floor(coreW / (powerPlan.vStrapPitch * scale)));
    const vStrapSpacing = coreW / (numVStraps + 1);
    const vStrapPositions = Array.from({ length: numVStraps }).map((_, i) => coreX0 + (i + 1) * vStrapSpacing);

    const numHStraps = Math.max(3, Math.floor(coreH / (powerPlan.hStrapPitch * scale)));
    const hStrapSpacing = coreH / (numHStraps + 1);
    const hStrapPositions = Array.from({ length: numHStraps }).map((_, i) => coreY0 + (i + 1) * hStrapSpacing);

    const ringW = Math.max(0.12, powerPlan.ringWidth * scale);
    const strapW = Math.max(0.08, powerPlan.vStrapWidth * scale);
    const trunkW = Math.max(0.1, (powerPlan.trunkWidth || 10) * scale);

    return (
        <group position={[0, 0, 0]}>
            {/* 1. Silicon Die Base Substrate */}
            <mesh position={[0, zSubstrate - 0.05, 0]} receiveShadow>
                <boxGeometry args={[dieW + 0.4, 0.08, dieH + 0.4]} />
                <meshStandardMaterial color={colorSubstrate} roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Core Boundary Imprint */}
            <mesh position={[coreX0 + coreW / 2, zSubstrate, coreY0 + coreH / 2]}>
                <boxGeometry args={[coreW, 0.02, coreH]} />
                <meshStandardMaterial color={colorCore} roughness={0.9} />
            </mesh>

            {/* Underlying Macro Blocks on Silicon */}
            {floorplan.macros.map((m) => {
                const mx = coreX0 + (m.x + m.width / 2) * scale;
                const my = coreY0 + (m.y + m.height / 2) * scale;
                const mw = m.width * scale;
                const mh = m.height * scale;
                const isMacSelected = selectedElement && selectedElement.name === m.name;
                return (
                    <group
                        key={m.id}
                        position={[mx, zSubstrate + 0.04, my]}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectElement?.({
                                name: m.name,
                                type: m.type,
                                layer: 'Core Macro Block',
                                role: 'Functional arithmetic/logic core powered by PDN mesh',
                                voltage: '1.0V Nominal',
                                width: `${m.width}µm`,
                                height: `${m.height}µm`
                            });
                        }}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            onHoverElement({ name: m.name, layer: 'Silicon Substrate', role: `Macro: ${m.type} (${m.width}x${m.height}µm)` });
                        }}
                    >
                        <mesh>
                            <boxGeometry args={[mw, 0.06, mh]} />
                            <meshStandardMaterial
                                color={isMacSelected ? '#38bdf8' : '#334155'}
                                emissive={isMacSelected ? '#0284c7' : '#000000'}
                                roughness={0.4}
                            />
                        </mesh>
                        <Text
                            position={[0, 0.05, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                            fontSize={0.22}
                            color={isMacSelected ? '#ffffff' : '#94a3b8'}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {m.name}
                        </Text>
                    </group>
                );
            })}

            {/* 2. Metal 1 Standard Cell Followpin Rails (M1) */}
            {(netFilter === 'ALL' || netFilter === 'VDD' || netFilter === 'VSS') && (
                <group position={[0, zM1, 0]}>
                    {Array.from({ length: 18 }).map((_, i) => {
                        const zPos = coreY0 + (i * coreH) / 18;
                        const isVdd = i % 2 === 0;
                        if (netFilter === 'VDD' && !isVdd) return null;
                        if (netFilter === 'VSS' && isVdd) return null;
                        const selected = isSelected('RAIL') || isSelected('FOLLOWPIN');
                        return (
                            <mesh
                                key={`rail_${i}`}
                                position={[coreX0 + coreW / 2, 0, zPos]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Standard Cell Rail M1 (${isVdd ? 'VDD' : 'VSS'})`,
                                        layer: 'Metal 1',
                                        role: 'Directly powers CMOS gates and standard cells along row',
                                        voltage: isVdd ? '1.0V' : '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Standard Cell Rail M1 (${isVdd ? 'VDD' : 'VSS'})`, layer: 'Metal 1', voltage: isVdd ? '1.0V' : '0V' });
                                }}
                            >
                                <boxGeometry args={[coreW, 0.015, 0.04]} />
                                <meshStandardMaterial
                                    color={selected ? '#38bdf8' : (isVdd ? colorVDD : colorVSS)}
                                    emissive={selected ? '#0284c7' : (isVdd ? '#7f1d1d' : '#083344')}
                                    roughness={0.3}
                                    metalness={0.8}
                                />
                            </mesh>
                        );
                    })}
                </group>
            )}

            {/* 3. Metal 5: Horizontal Power Straps & Horizontal Core Rings */}
            {(netFilter === 'ALL' || netFilter === 'VDD' || netFilter === 'VSS') && (
                <group position={[0, zM5, 0]}>
                    {/* Horizontal Ring Segments (Top and Bottom) */}
                    {powerPlan.enableRings && (
                        <>
                            {/* Top VDD Ring Segment */}
                            <mesh
                                position={[coreX0 + coreW / 2, 0, coreY0 - 0.2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Horizontal Core Power Ring (VDD)',
                                        layer: 'Metal 5',
                                        role: 'Closed-loop perimeter power ring providing uniform VDD',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Horizontal Core Power Ring (VDD)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[coreW + 0.6, 0.03, ringW]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#facc15' : colorVDD}
                                    emissive={isSelected('RING') ? '#ca8a04' : '#991b1b'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Bottom VDD Ring Segment */}
                            <mesh
                                position={[coreX0 + coreW / 2, 0, coreY0 + coreH + 0.2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Horizontal Core Power Ring (VDD)',
                                        layer: 'Metal 5',
                                        role: 'Closed-loop perimeter power ring providing uniform VDD',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Horizontal Core Power Ring (VDD)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[coreW + 0.6, 0.03, ringW]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#facc15' : colorVDD}
                                    emissive={isSelected('RING') ? '#ca8a04' : '#991b1b'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Top VSS Inner Ring Segment */}
                            <mesh
                                position={[coreX0 + coreW / 2, 0, coreY0 - 0.05]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Horizontal Core Power Ring (VSS)',
                                        layer: 'Metal 5',
                                        role: 'Closed-loop perimeter ground return ring',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Horizontal Core Power Ring (VSS)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '0V' });
                                }}
                            >
                                <boxGeometry args={[coreW + 0.3, 0.03, ringW]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#38bdf8' : colorVSS}
                                    emissive={isSelected('RING') ? '#0284c7' : '#0e7490'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Bottom VSS Inner Ring Segment */}
                            <mesh
                                position={[coreX0 + coreW / 2, 0, coreY0 + coreH + 0.05]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Horizontal Core Power Ring (VSS)',
                                        layer: 'Metal 5',
                                        role: 'Closed-loop perimeter ground return ring',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Horizontal Core Power Ring (VSS)', layer: 'Metal 5', width: `${powerPlan.ringWidth}µm`, voltage: '0V' });
                                }}
                            >
                                <boxGeometry args={[coreW + 0.3, 0.03, ringW]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#38bdf8' : colorVSS}
                                    emissive={isSelected('RING') ? '#0284c7' : '#0e7490'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                        </>
                    )}

                    {/* Horizontal Mesh Straps */}
                    {powerPlan.enableHStraps && hStrapPositions.map((yPos, idx) => {
                        const isVdd = idx % 2 === 0;
                        if (netFilter === 'VDD' && !isVdd) return null;
                        if (netFilter === 'VSS' && isVdd) return null;
                        const selected = isSelected(`Horizontal Strap #${idx + 1}`) || isSelected('HORIZONTAL');
                        return (
                            <mesh
                                key={`hstrap_${idx}`}
                                position={[coreX0 + coreW / 2, 0, yPos]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Horizontal Strap #${idx + 1} (${isVdd ? 'VDD' : 'VSS'})`,
                                        layer: 'Metal 5',
                                        role: 'Distributes current horizontally and drops vias to M1 rails',
                                        width: `${powerPlan.hStrapWidth}µm`,
                                        voltage: isVdd ? '1.0V' : '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Horizontal Strap #${idx + 1} (${isVdd ? 'VDD' : 'VSS'})`, layer: 'Metal 5', width: `${powerPlan.hStrapWidth}µm`, voltage: isVdd ? '1.0V' : '0V' });
                                }}
                            >
                                <boxGeometry args={[coreW + 0.4, 0.03, strapW]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : (isVdd ? colorHStrap : colorVSS)}
                                    emissive={selected ? '#ca8a04' : (isVdd ? '#7f1d1d' : '#083344')}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                        );
                    })}
                </group>
            )}

            {/* 4. Metal 6: Vertical Power Straps & Vertical Core Rings (Green layer in CAD) */}
            {(netFilter === 'ALL' || netFilter === 'VDD' || netFilter === 'VSS') && (
                <group position={[0, zM6, 0]}>
                    {/* Vertical Ring Segments (Left and Right sides) */}
                    {powerPlan.enableRings && (
                        <>
                            {/* Left VDD Ring */}
                            <mesh
                                position={[coreX0 - 0.2, 0, coreY0 + coreH / 2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Vertical Core Power Ring (VDD)',
                                        layer: 'Metal 6',
                                        role: 'Closed-loop vertical perimeter power ring (VDD)',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Vertical Core Power Ring (VDD)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[ringW, 0.035, coreH + 0.6]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#facc15' : colorVStrap}
                                    emissive={isSelected('RING') ? '#ca8a04' : '#14532d'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Right VDD Ring */}
                            <mesh
                                position={[coreX0 + coreW + 0.2, 0, coreY0 + coreH / 2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Vertical Core Power Ring (VDD)',
                                        layer: 'Metal 6',
                                        role: 'Closed-loop vertical perimeter power ring (VDD)',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Vertical Core Power Ring (VDD)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[ringW, 0.035, coreH + 0.6]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#facc15' : colorVStrap}
                                    emissive={isSelected('RING') ? '#ca8a04' : '#14532d'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Left VSS Ring */}
                            <mesh
                                position={[coreX0 - 0.05, 0, coreY0 + coreH / 2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Vertical Core Power Ring (VSS)',
                                        layer: 'Metal 6',
                                        role: 'Closed-loop vertical perimeter ground return (VSS)',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Vertical Core Power Ring (VSS)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '0V' });
                                }}
                            >
                                <boxGeometry args={[ringW, 0.035, coreH + 0.3]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#38bdf8' : colorVSS}
                                    emissive={isSelected('RING') ? '#0284c7' : '#0e7490'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                            {/* Right VSS Ring */}
                            <mesh
                                position={[coreX0 + coreW + 0.05, 0, coreY0 + coreH / 2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: 'Vertical Core Power Ring (VSS)',
                                        layer: 'Metal 6',
                                        role: 'Closed-loop vertical perimeter ground return (VSS)',
                                        width: `${powerPlan.ringWidth}µm`,
                                        voltage: '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: 'Vertical Core Power Ring (VSS)', layer: 'Metal 6', width: `${powerPlan.ringWidth}µm`, voltage: '0V' });
                                }}
                            >
                                <boxGeometry args={[ringW, 0.035, coreH + 0.3]} />
                                <meshStandardMaterial
                                    color={isSelected('RING') ? '#38bdf8' : colorVSS}
                                    emissive={isSelected('RING') ? '#0284c7' : '#0e7490'}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                        </>
                    )}

                    {/* Vertical Mesh Straps */}
                    {powerPlan.enableVStraps && vStrapPositions.map((xPos, idx) => {
                        const isVdd = idx % 2 === 0;
                        if (netFilter === 'VDD' && !isVdd) return null;
                        if (netFilter === 'VSS' && isVdd) return null;
                        const selected = isSelected(`Vertical Strap #${idx + 1}`) || isSelected('VERTICAL');
                        return (
                            <mesh
                                key={`vstrap_${idx}`}
                                position={[xPos, 0, coreY0 + coreH / 2]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Vertical Strap #${idx + 1} (${isVdd ? 'VDD' : 'VSS'})`,
                                        layer: 'Metal 6',
                                        role: 'Runs vertically across core to provide high-current low-R path',
                                        width: `${powerPlan.vStrapWidth}µm`,
                                        voltage: isVdd ? '1.0V' : '0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Vertical Strap #${idx + 1} (${isVdd ? 'VDD' : 'VSS'})`, layer: 'Metal 6', width: `${powerPlan.vStrapWidth}µm`, voltage: isVdd ? '1.0V' : '0V' });
                                }}
                            >
                                <boxGeometry args={[strapW, 0.035, coreH + 0.4]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : (isVdd ? colorVStrap : colorVSS)}
                                    emissive={selected ? '#ca8a04' : (isVdd ? '#15803d' : '#083344')}
                                    roughness={0.2}
                                    metalness={0.9}
                                />
                            </mesh>
                        );
                    })}
                </group>
            )}

            {/* 5. Pad-to-Core Feeder Trunks (Metal 7/8 - as circled in user image!) */}
            {(netFilter === 'ALL' || netFilter === 'VDD' || netFilter === 'VSS') && (
                <group position={[0, zM7Trunk, 0]}>
                    {/* West / Left Side Feeder Trunks */}
                    {[-0.6, -0.2, 0.2, 0.6].map((offset, i) => {
                        const selected = isSelected('TRUNK') || isSelected('PAD-TO-CORE');
                        return (
                            <mesh
                                key={`west_trunk_${i}`}
                                position={[-dieW / 2 + 0.45, 0, offset]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Pad-to-Core Power Trunk (West-${i + 1})`,
                                        layer: 'Metal 7 / 8',
                                        role: 'Heavy redistribution metal feeding current into core ring',
                                        resistance: '0.024 Ω',
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Pad-to-Core Power Trunk (West-${i + 1})`, layer: 'Metal 7 / 8', role: 'Direct feeder line from IO power pad to core ring', voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[0.9, 0.04, trunkW]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : '#fbbf24'}
                                    emissive={selected ? '#eab308' : '#78350f'}
                                    metalness={0.9}
                                    roughness={0.1}
                                />
                            </mesh>
                        );
                    })}

                    {/* East / Right Side Feeder Trunks */}
                    {[-0.6, -0.2, 0.2, 0.6].map((offset, i) => {
                        const selected = isSelected('TRUNK') || isSelected('PAD-TO-CORE');
                        return (
                            <mesh
                                key={`east_trunk_${i}`}
                                position={[dieW / 2 - 0.45, 0, offset]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Pad-to-Core Power Trunk (East-${i + 1})`,
                                        layer: 'Metal 7 / 8',
                                        role: 'Heavy redistribution metal feeding current into core ring',
                                        resistance: '0.024 Ω',
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Pad-to-Core Power Trunk (East-${i + 1})`, layer: 'Metal 7 / 8', role: 'Direct feeder line from IO power pad to core ring', voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[0.9, 0.04, trunkW]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : '#fbbf24'}
                                    emissive={selected ? '#eab308' : '#78350f'}
                                    metalness={0.9}
                                    roughness={0.1}
                                />
                            </mesh>
                        );
                    })}

                    {/* North / Top Feeder Trunks */}
                    {[-0.6, -0.2, 0.2, 0.6].map((offset, i) => {
                        const selected = isSelected('TRUNK') || isSelected('PAD-TO-CORE');
                        return (
                            <mesh
                                key={`north_trunk_${i}`}
                                position={[offset, 0, -dieH / 2 + 0.45]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Pad-to-Core Power Trunk (North-${i + 1})`,
                                        layer: 'Metal 7 / 8',
                                        role: 'Heavy redistribution metal feeding current into core ring',
                                        resistance: '0.024 Ω',
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Pad-to-Core Power Trunk (North-${i + 1})`, layer: 'Metal 7 / 8', role: 'Direct feeder line from IO power pad to core ring', voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[trunkW, 0.04, 0.9]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : '#fbbf24'}
                                    emissive={selected ? '#eab308' : '#78350f'}
                                    metalness={0.9}
                                    roughness={0.1}
                                />
                            </mesh>
                        );
                    })}

                    {/* South / Bottom Feeder Trunks */}
                    {[-0.6, -0.2, 0.2, 0.6].map((offset, i) => {
                        const selected = isSelected('TRUNK') || isSelected('PAD-TO-CORE');
                        return (
                            <mesh
                                key={`south_trunk_${i}`}
                                position={[offset, 0, dieH / 2 - 0.45]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Pad-to-Core Power Trunk (South-${i + 1})`,
                                        layer: 'Metal 7 / 8',
                                        role: 'Heavy redistribution metal feeding current into core ring',
                                        resistance: '0.024 Ω',
                                        voltage: '1.0V'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Pad-to-Core Power Trunk (South-${i + 1})`, layer: 'Metal 7 / 8', role: 'Direct feeder line from IO power pad to core ring', voltage: '1.0V' });
                                }}
                            >
                                <boxGeometry args={[trunkW, 0.04, 0.9]} />
                                <meshStandardMaterial
                                    color={selected ? '#facc15' : '#fbbf24'}
                                    emissive={selected ? '#eab308' : '#78350f'}
                                    metalness={0.9}
                                    roughness={0.1}
                                />
                            </mesh>
                        );
                    })}
                </group>
            )}

            {/* 6. Inter-Layer Via Stacks (Connecting vertical and horizontal layers) */}
            <group position={[0, 0, 0]}>
                {vStrapPositions.map((vx, vi) => {
                    return hStrapPositions.map((hy, hi) => {
                        const isVddV = vi % 2 === 0;
                        const isVddH = hi % 2 === 0;
                        if (isVddV !== isVddH) return null;
                        if (netFilter === 'VDD' && !isVddV) return null;
                        if (netFilter === 'VSS' && isVddV) return null;
                        const selected = isSelected('VIA');

                        return (
                            <mesh
                                key={`via_stack_${vi}_${hi}`}
                                position={[vx, (zM5 + zM6) / 2, hy]}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectElement?.({
                                        name: `Inter-Layer Via Stack (M5-M6 Cross Connection)`,
                                        layer: 'Via 5 Matrix',
                                        role: 'Multi-cut via array connecting orthogonal M5 and M6 conductors',
                                        resistance: '0.075 Ω'
                                    });
                                }}
                                onPointerOver={(e) => {
                                    e.stopPropagation();
                                    onHoverElement({ name: `Via Stack (M5-M6 Cross Connection)`, layer: 'Via 5', resistance: '0.08 Ω' });
                                }}
                            >
                                <cylinderGeometry args={[0.04, 0.04, zM6 - zM5, 8]} />
                                <meshStandardMaterial
                                    color={selected ? '#38bdf8' : colorVia}
                                    emissive={selected ? '#0284c7' : '#854d0e'}
                                    metalness={0.9}
                                    roughness={0.1}
                                />
                            </mesh>
                        );
                    });
                })}
            </group>

            {/* 7. IO Power Pads at Perimeter (Top Layer) */}
            <group position={[0, zPads, 0]}>
                {floorplan.ioPads.filter(p => p.type === 'power' || p.type === 'ground').map((pad) => {
                    const isVdd = pad.type === 'power';
                    let px = 0;
                    let pz = 0;
                    if (pad.side === 'top') {
                        px = -dieW / 2 + pad.offset * scale;
                        pz = -dieH / 2;
                    } else if (pad.side === 'bottom') {
                        px = -dieW / 2 + pad.offset * scale;
                        pz = dieH / 2;
                    } else if (pad.side === 'left') {
                        px = -dieW / 2;
                        pz = -dieH / 2 + pad.offset * scale;
                    } else {
                        px = dieW / 2;
                        pz = -dieH / 2 + pad.offset * scale;
                    }

                    return (
                        <mesh
                            key={pad.id}
                            position={[px, 0, pz]}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectElement?.({
                                    name: `IO Pad: ${pad.name}`,
                                    type: pad.type.toUpperCase(),
                                    side: pad.side,
                                    layer: 'Top Metal / C4 Bump',
                                    role: 'Peripheral chip contact receiving external supply voltage',
                                    voltage: isVdd ? '1.0V' : '0V'
                                });
                            }}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                onHoverElement({ name: `IO Pad: ${pad.name}`, type: pad.type.toUpperCase(), side: pad.side, layer: 'Top Metal / C4 Bump' });
                            }}
                        >
                            <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
                            <meshStandardMaterial color={isVdd ? '#ef4444' : '#06b6d4'} metalness={0.8} roughness={0.2} />
                        </mesh>
                    );
                })}
            </group>
        </group>
    );
}

// Fallback Isometric 3D Canvas
function Fallback3DPDN({
    layerExplode,
    netFilter
}: {
    layerExplode: number;
    netFilter: 'ALL' | 'VDD' | 'VSS';
}) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#090b0e] text-center">
            <Zap size={48} className="text-amber-400 mb-3 opacity-80 animate-pulse" />
            <h3 className="text-base font-bold font-mono text-gray-200">3D Power Distribution Stack</h3>
            <p className="text-xs text-gray-400 max-w-md mt-1 font-mono">
                Multi-layer silicon stack with Metal 1 Followpin Rails, Metal 5 Horizontal Straps, Metal 6 Vertical Straps, and Metal 7/8 Pad-to-Core Feeder Trunks.
            </p>
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-left max-w-sm w-full space-y-2">
                <div className="flex justify-between"><span className="text-gray-400">Pad Feeder Trunks:</span><span className="text-yellow-400 font-bold">M7 / M8 (Active)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Vertical Straps:</span><span className="text-emerald-400 font-bold">M6 (Low-R Mesh)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Horizontal Straps:</span><span className="text-red-400 font-bold">M5 (Orthogonal)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Followpin Rails:</span><span className="text-cyan-400 font-bold">M1 (Standard Cells)</span></div>
            </div>
        </div>
    );
}

export function PowerPlan3DViewer({
    floorplan,
    powerPlan,
    selectedElement,
    onSelectElement,
    onSwitchTo2D
}: PowerPlan3DViewerProps) {
    const [layerExplode, setLayerExplode] = useState<number>(1.8); // 1x to 4x vertical expansion
    const [netFilter, setNetFilter] = useState<'ALL' | 'VDD' | 'VSS'>('ALL');
    const [animateFlow, setAnimateFlow] = useState<boolean>(true);
    const [hoveredElement, setHoveredElement] = useState<any>(null);
    const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'side' | 'exploded'>('iso');

    return (
        <div className="w-full h-full flex flex-col bg-[#08090c] text-gray-200 relative select-none overflow-hidden">
            {/* Top 3D Control Bar */}
            <div className="p-3 bg-[#111317] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Zap size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white font-mono flex items-center space-x-2">
                            <span>3D Multi-Layer Power Distribution Network (PDN)</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Interactive 3D Silicon Stack
                            </span>
                        </h3>
                        <p className="text-[11px] text-gray-400 font-mono">
                            Click any 3D ring, strap, trunk, rail, or macro to inspect internal schematics & microarchitecture
                        </p>
                    </div>
                </div>

                {/* 3D Action Tools & Camera Views */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Camera Preset Buttons */}
                    <div className="flex items-center bg-black/50 p-1 rounded-lg border border-white/10 text-xs font-mono">
                        <button
                            onClick={() => { setCameraPreset('iso'); setLayerExplode(1.8); }}
                            className={`px-2 py-1 rounded transition-all flex items-center space-x-1 ${cameraPreset === 'iso' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                            title="Isometric 3D Perspective"
                        >
                            <Camera size={11} />
                            <span>3D Iso</span>
                        </button>
                        <button
                            onClick={() => { setCameraPreset('exploded'); setLayerExplode(2.8); }}
                            className={`px-2 py-1 rounded transition-all flex items-center space-x-1 ${cameraPreset === 'exploded' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                            title="Exploded Vertical Metal Stack"
                        >
                            <Layers size={11} />
                            <span>Exploded Stack</span>
                        </button>
                        <button
                            onClick={() => { setCameraPreset('top'); }}
                            className={`px-2 py-1 rounded transition-all flex items-center space-x-1 ${cameraPreset === 'top' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                            title="Top-Down Orthogonal View"
                        >
                            <Compass size={11} />
                            <span>Top-Down</span>
                        </button>
                        <button
                            onClick={() => { setCameraPreset('side'); }}
                            className={`px-2 py-1 rounded transition-all flex items-center space-x-1 ${cameraPreset === 'side' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                            title="Side Cross-Section View"
                        >
                            <Box size={11} />
                            <span>Side View</span>
                        </button>
                    </div>

                    {/* Layer Explode Slider */}
                    <div className="flex items-center space-x-2 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs">
                        <span className="text-gray-400 font-mono text-[11px]">Explode:</span>
                        <input
                            type="range" min="0.6" max="3.5" step="0.1" value={layerExplode}
                            onChange={e => setLayerExplode(parseFloat(e.target.value))}
                            className="w-20 accent-amber-500"
                        />
                        <span className="font-mono text-amber-400 font-bold text-xs">{layerExplode.toFixed(1)}x</span>
                    </div>

                    {/* Net Filter Buttons */}
                    <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
                        {(['ALL', 'VDD', 'VSS'] as const).map(net => (
                            <button
                                key={net}
                                onClick={() => setNetFilter(net)}
                                className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-all ${netFilter === net
                                        ? net === 'VDD' ? 'bg-red-600 text-white' : net === 'VSS' ? 'bg-cyan-600 text-white' : 'bg-amber-500 text-black'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>

                    {onSwitchTo2D && (
                        <button
                            onClick={onSwitchTo2D}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors flex items-center space-x-1"
                            title="Return to 2D CAD Layout"
                        >
                            <Compass size={12} />
                            <span>2D CAD</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main 3D Viewport */}
            <div className="flex-1 relative overflow-hidden">
                {/* Helper Instructions Badge */}
                <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-mono text-gray-300 shadow-xl flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Interactive: Click any element to select & open circuit diagram • Drag to rotate • Scroll to zoom</span>
                    </div>

                    {/* Silicon Stack Legend */}
                    <div className="bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[11px] font-mono text-gray-300 shadow-xl space-y-1.5 w-64 pointer-events-auto">
                        <div className="font-bold text-gray-100 border-b border-white/10 pb-1 flex items-center justify-between">
                            <span>SILICON METAL STACK</span>
                            <span className="text-[10px] text-amber-400">CLICK TO SELECT</span>
                        </div>
                        <button
                            onClick={() => onSelectElement?.({ name: 'Pad-to-Core Feeder Trunk (Metal 7/8)', layer: 'Metal 7 / 8' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /><span>Pad Feeder Trunks</span></span>
                            <span className="text-gray-400">M7/M8</span>
                        </button>
                        <button
                            onClick={() => onSelectElement?.({ name: 'Vertical Power Strap (Metal 6)', layer: 'Metal 6' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span>Vertical Straps</span></span>
                            <span className="text-gray-400">M6</span>
                        </button>
                        <button
                            onClick={() => onSelectElement?.({ name: 'Horizontal Power Strap (Metal 5)', layer: 'Metal 5' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span>Horizontal Straps</span></span>
                            <span className="text-gray-400">M5</span>
                        </button>
                        <button
                            onClick={() => onSelectElement?.({ name: 'Inter-Layer Power Via Stack', layer: 'Via 5' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" /><span>Inter-layer Vias</span></span>
                            <span className="text-gray-400">V5/V6</span>
                        </button>
                        <button
                            onClick={() => onSelectElement?.({ name: 'Standard Cell Followpin Rail (M1)', layer: 'Metal 1' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /><span>Followpin Rails</span></span>
                            <span className="text-gray-400">M1</span>
                        </button>
                        <button
                            onClick={() => onSelectElement?.({ name: 'ADDER_SUB_UNIT', layer: 'Silicon Substrate' })}
                            className="w-full flex justify-between items-center hover:bg-white/10 p-0.5 rounded transition-colors text-left"
                        >
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /><span>Silicon Substrate & Macros</span></span>
                            <span className="text-gray-400">Die</span>
                        </button>
                    </div>
                </div>

                {/* Hover Inspector Tooltip */}
                {hoveredElement && (
                    <div className="absolute top-4 right-4 z-10 bg-[#121418]/95 backdrop-blur-md p-4 rounded-xl border border-amber-500/40 shadow-2xl max-w-sm pointer-events-none space-y-1.5 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="font-bold text-amber-400">{hoveredElement.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">{hoveredElement.layer || 'PDN'}</span>
                        </div>
                        {hoveredElement.role && (
                            <p className="text-[11px] text-gray-300 font-sans">{hoveredElement.role}</p>
                        )}
                        {hoveredElement.voltage && (
                            <div className="flex justify-between text-gray-400"><span>Voltage:</span><span className="text-emerald-400 font-bold">{hoveredElement.voltage}</span></div>
                        )}
                        {hoveredElement.width && (
                            <div className="flex justify-between text-gray-400"><span>Metal Width:</span><span className="text-white">{hoveredElement.width}</span></div>
                        )}
                    </div>
                )}

                {/* WebGL 3D Canvas */}
                <ErrorBoundary fallback={<Fallback3DPDN layerExplode={layerExplode} netFilter={netFilter} />}>
                    <Canvas
                        camera={{ position: [9, 8, 9], fov: 45 }}
                        shadows
                        className="w-full h-full cursor-grab active:cursor-grabbing"
                    >
                        <ambientLight intensity={0.7} />
                        <directionalLight position={[12, 16, 8]} intensity={1.5} castShadow />
                        <directionalLight position={[-12, 10, -8]} intensity={0.6} color="#38bdf8" />
                        <directionalLight position={[0, -8, 0]} intensity={0.3} />

                        <CameraController cameraPreset={cameraPreset} />

                        <PDN3DScene
                            floorplan={floorplan}
                            powerPlan={powerPlan}
                            layerExplode={layerExplode}
                            netFilter={netFilter}
                            animateFlow={animateFlow}
                            onHoverElement={setHoveredElement}
                            selectedElement={selectedElement}
                            onSelectElement={onSelectElement}
                        />

                        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                    </Canvas>
                </ErrorBoundary>

                {/* Bottom Explanatory Footnote */}
                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                    <div className="bg-black/85 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-gray-300 shadow-xl max-w-2xl">
                        <span className="text-amber-400 font-bold">Why the 3D Silicon Stack? </span>
                        <span>External power enters on top global layers (M7/M8) with wide tracks to minimize total IR drop, transfers to orthogonal intermediate layers (M5/M6), and drops through vertical tungsten via matrices to fine-pitch local rails (M1).</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
