/**
 * AR Engine - Moteur de réalité augmentée pour effets faciaux
 * Utilise MediaPipe FaceLandmarker pour détecter les points du visage
 * Applique les effets beauté et visuels en temps réel sur un canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from './EffectsPanel';

interface AREngineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording: boolean;
}

/**
 * Key indices pour les points faciaux MediaPipe FaceMesh (468 points)
 */
const FACE_LANDMARKS = {
  // Contour du visage
  faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  
  // Yeux
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEye: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  
  // Lèvres
  upperLip: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  lowerLip: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  
  // Nez
  noseTip: [1],
  noseBridge: [6, 197, 195, 5, 4],
  
  // Sourcils
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightEyebrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  
  // Menton
  chin: [152],
  
  // Joues
  leftCheek: [205],
  rightCheek: [425],
};

/**
 * Calcule le centre d'un groupe de landmarks
 */
function getCenter(landmarks: NormalizedLandmark[]): { x: number; y: number; z: number } {
  if (landmarks.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = landmarks.reduce((acc, lm) => ({
    x: acc.x + lm.x,
    y: acc.y + lm.y,
    z: acc.z + lm.z,
  }), { x: 0, y: 0, z: 0 });
  return {
    x: sum.x / landmarks.length,
    y: sum.y / landmarks.length,
    z: sum.z / landmarks.length,
  };
}

/**
 * Calcule la distance entre deux points
 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Dessine des oreilles d'animal sur le canvas
 */
function drawAnimalEars(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  type: 'cat' | 'dog' | 'rabbit' | 'bear'
) {
  const leftEyebrow = FACE_LANDMARKS.leftEyebrow;
  const rightEyebrow = FACE_LANDMARKS.rightEyebrow;
  
  const leftCenter = getCenter(leftEyebrow.map(i => landmarks[i]));
  const rightCenter = getCenter(rightEyebrow.map(i => landmarks[i]));
  
  const lx = leftCenter.x * canvasWidth;
  const ly = leftCenter.y * canvasHeight;
  const rx = rightCenter.x * canvasWidth;
  const ry = rightCenter.y * canvasHeight;
  
  const earWidth = Math.abs(rx - lx) * 0.35;
  const earHeight = type === 'rabbit' ? earWidth * 3 : earWidth * 1.5;
  const offset = type === 'rabbit' ? earHeight * 0.5 : earHeight * 0.3;
  
  ctx.save();
  
  // Oreille gauche
  ctx.beginPath();
  ctx.ellipse(lx - earWidth * 0.3, ly - offset, earWidth, earHeight, -0.2, 0, 2 * Math.PI);
  ctx.fillStyle = type === 'cat' ? '#ff6b6b' : type === 'dog' ? '#8B4513' : type === 'rabbit' ? '#ffb7b2' : '#5c4033';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Intérieur oreille gauche
  ctx.beginPath();
  ctx.ellipse(lx - earWidth * 0.3, ly - offset, earWidth * 0.5, earHeight * 0.6, -0.2, 0, 2 * Math.PI);
  ctx.fillStyle = type === 'cat' ? '#ff8a8a' : type === 'dog' ? '#CD853F' : type === 'rabbit' ? '#ffc8c8' : '#6d4c41';
  ctx.fill();
  
  // Oreille droite
  ctx.beginPath();
  ctx.ellipse(rx + earWidth * 0.3, ry - offset, earWidth, earHeight, 0.2, 0, 2 * Math.PI);
  ctx.fillStyle = type === 'cat' ? '#ff6b6b' : type === 'dog' ? '#8B4513' : type === 'rabbit' ? '#ffb7b2' : '#5c4033';
  ctx.fill();
  ctx.stroke();
  
  // Intérieur oreille droite
  ctx.beginPath();
  ctx.ellipse(rx + earWidth * 0.3, ry - offset, earWidth * 0.5, earHeight * 0.6, 0.2, 0, 2 * Math.PI);
  ctx.fillStyle = type === 'cat' ? '#ff8a8a' : type === 'dog' ? '#CD853F' : type === 'rabbit' ? '#ffc8c8' : '#6d4c41';
  ctx.fill();
  
  ctx.restore();
}

/**
 * Dessine une couronne sur le canvas
 */
function drawCrown(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number
) {
  const eyebrowCenter = getCenter([
    ...FACE_LANDMARKS.leftEyebrow.map(i => landmarks[i]),
    ...FACE_LANDMARKS.rightEyebrow.map(i => landmarks[i]),
  ]);
  
  const cx = eyebrowCenter.x * canvasWidth;
  const cy = eyebrowCenter.y * canvasHeight;
  const crownWidth = 80;
  const crownHeight = 40;
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - crownWidth / 2, cy - crownHeight);
  ctx.lineTo(cx - crownWidth / 2 + crownWidth * 0.1, cy - crownHeight * 1.4);
  ctx.lineTo(cx - crownWidth / 2 + crownWidth * 0.25, cy - crownHeight * 0.7);
  ctx.lineTo(cx, cy - crownHeight * 1.5);
  ctx.lineTo(cx + crownWidth / 2 - crownWidth * 0.25, cy - crownHeight * 0.7);
  ctx.lineTo(cx + crownWidth / 2 - crownWidth * 0.1, cy - crownHeight * 1.4);
  ctx.lineTo(cx + crownWidth / 2, cy - crownHeight);
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Joyaux
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(cx, cy - crownHeight * 1.1, 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#00FF00';
  ctx.beginPath();
  ctx.arc(cx - crownWidth * 0.2, cy - crownHeight * 0.85, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + crownWidth * 0.2, cy - crownHeight * 0.85, 3, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Dessine des coeurs flottants
 */
function drawHearts(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  time: number
) {
  const faceCenter = getCenter([
    landmarks[10],
    landmarks[152],
  ]);
  const cx = faceCenter.x * canvasWidth;
  const cy = faceCenter.y * canvasHeight;
  
  const hearts = [
    { x: cx - 80, y: cy + Math.sin(time * 2) * 20, size: 20, rotation: 0.3 },
    { x: cx + 80, y: cy + Math.cos(time * 1.5) * 15, size: 25, rotation: -0.2 },
    { x: cx - 40, y: cy - 60 + Math.sin(time * 3) * 10, size: 15, rotation: 0.1 },
    { x: cx + 40, y: cy - 60 + Math.cos(time * 2.5) * 12, size: 18, rotation: -0.15 },
    { x: cx, y: cy + 40 + Math.sin(time * 1.8) * 18, size: 22, rotation: 0 },
  ];
  
  ctx.save();
  hearts.forEach(heart => {
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.rotate(heart.rotation);
    ctx.font = `${heart.size}px serif`;
    ctx.fillText('❤️', -heart.size / 2, -heart.size / 2);
    ctx.restore();
  });
  ctx.restore();
}

/**
 * Dessine des étincelles
 */
function drawSparkles(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  time: number
) {
  const sparklePoints = [
    landmarks[10],   // front
    landmarks[152],  // menton
    landmarks[1],    // nez
    landmarks[33],   // oeil gauche
    landmarks[263],  // oeil droit
  ];
  
  ctx.save();
  sparklePoints.forEach((lm, i) => {
    const x = lm.x * canvasWidth;
    const y = lm.y * canvasHeight;
    const alpha = 0.5 + 0.5 * Math.sin(time * 3 + i);
    const size = 5 + 3 * Math.sin(time * 2 + i);
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    
    // Dessiner une étoile
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Dessine un effet glitch
 */
function drawGlitch(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  time: number
) {
  if (Math.random() > 0.7) {
    const sliceHeight = 5 + Math.random() * 20;
    const sliceY = Math.random() * canvasHeight;
    const offset = (Math.random() - 0.5) * 20;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const imageData = ctx.getImageData(0, sliceY, canvasWidth, sliceHeight);
    ctx.putImageData(imageData, offset, sliceY);
    ctx.restore();
    
    // Overlay coloré
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,255,0.1)';
    ctx.fillRect(0, sliceY, canvasWidth, sliceHeight);
  }
}

/**
 * Dessine un effet feu
 */
function drawFire(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  time: number
) {
  const jawPoints = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  
  ctx.save();
  const particles = 20;
  for (let i = 0; i < particles; i++) {
    const idx = jawPoints[i % jawPoints.length];
    const lm = landmarks[idx];
    const x = lm.x * canvasWidth + (Math.random() - 0.5) * 40;
    const y = lm.y * canvasHeight + Math.random() * 30;
    const size = 3 + Math.random() * 8;
    const alpha = 0.3 + Math.random() * 0.5;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, `rgba(255, 200, 0, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y - Math.sin(time * 3 + i) * 5, size, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Composant principal du moteur AR
 */
export const AREngine: React.FC<AREngineProps> = ({
  videoRef,
  activeEffect,
  isRecording,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Initialiser FaceLandmarker
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      } catch (err) {
        console.error("AR Engine init failed:", err);
      }
    };
    init();
    
    return () => {
      faceLandmarkerRef.current?.close();
    };
  }, []);

  // Boucle de rendu AR
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = faceLandmarkerRef.current;
    
    if (!video || !canvas || !landmarker || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timeRef.current += 0.016;
    
    if (!activeEffect) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    
    // Détecter les landmarks du visage
    const results = landmarker.detectForVideo(video, performance.now());
    
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      // Pas de visage détecté - appliquer quand même les filtres visuels
      if (activeEffect.visualConfig) {
        ctx.globalAlpha = activeEffect.visualConfig.intensity || 0.7;
        ctx.fillStyle = getFilterOverlayColor(activeEffect.visualConfig.filter || '');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    
    const landmarks = results.faceLandmarks[0];
    
    // ============ APPLIQUER LES EFFETS BEAUTÉ ============
    if (activeEffect.beautyConfig) {
      const config = activeEffect.beautyConfig;
      
      // Lissage de la peau (blur la zone du visage)
      if (config.smoothSkin && config.smoothSkin > 0) {
        const faceBounds = getFaceBounds(landmarks);
        const padding = 20;
        const x = Math.max(0, (faceBounds.left - padding) * canvas.width);
        const y = Math.max(0, (faceBounds.top - padding) * canvas.height);
        const w = (faceBounds.right - faceBounds.left + padding * 2) * canvas.width;
        const h = (faceBounds.bottom - faceBounds.top + padding * 2) * canvas.height;
        
        // Dessiner un blur doux sur la zone du visage
        ctx.save();
        ctx.filter = `blur(${config.smoothSkin * 3}px)`;
        ctx.globalAlpha = config.smoothSkin * 0.4;
        ctx.drawImage(video, x, y, w, h, x, y, w, h);
        ctx.restore();
        
        // Overlay de luminosité
        ctx.save();
        ctx.globalAlpha = config.brightenSkin ? config.brightenSkin * 0.15 : 0;
        ctx.fillStyle = 'rgba(255, 240, 230, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
          faceBounds.centerX * canvas.width,
          faceBounds.centerY * canvas.height,
          w / 2.5,
          h / 2.5,
          0, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.restore();
      }
      
      // Agrandir les yeux
      if (config.enlargeEyes && config.enlargeEyes > 0) {
        drawEyeEnlargement(ctx, landmarks, canvas.width, canvas.height, config.enlargeEyes);
      }
      
      // Affiner le visage (dessiner un overlay sur les contours)
      if (config.slimFace && config.slimFace > 0) {
        drawFaceSlimming(ctx, landmarks, canvas.width, canvas.height, config.slimFace);
      }
      
      // Blanchir les dents (overlay lumineux sur la bouche)
      if (config.whitenTeeth && config.whitenTeeth > 0) {
        const mouthCenter = getCenter([
          ...FACE_LANDMARKS.upperLip.map(i => landmarks[i]),
          ...FACE_LANDMARKS.lowerLip.map(i => landmarks[i]),
        ]);
        const mx = mouthCenter.x * canvas.width;
        const my = mouthCenter.y * canvas.height;
        
        ctx.save();
        ctx.globalAlpha = config.whitenTeeth * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(mx, my, 15 * canvas.width / 1280, 10 * canvas.height / 720, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
      
      // Agrandir les lèvres
      if (config.enlargeLips && config.enlargeLips > 0) {
        drawLipEnhancement(ctx, landmarks, canvas.width, canvas.height, config.enlargeLips);
      }
    }
    
    // ============ APPLIQUER LES EFFETS VISUELS ============
    if (activeEffect.visualConfig) {
      const config = activeEffect.visualConfig;
      
      // Overlay coloré global
      if (config.filter && config.intensity) {
        ctx.save();
        ctx.globalAlpha = config.intensity * 0.3;
        const colors = getOverlayGradient(config.filter);
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      
      // Overlays spécifiques
      if (config.overlay) {
        switch (config.overlay) {
          case 'cat-ears':
            drawAnimalEars(ctx, landmarks, canvas.width, canvas.height, 'cat');
            break;
          case 'dog-ears':
            drawAnimalEars(ctx, landmarks, canvas.width, canvas.height, 'dog');
            break;
          case 'rabbit-ears':
            drawAnimalEars(ctx, landmarks, canvas.width, canvas.height, 'rabbit');
            break;
          case 'bear-ears':
            drawAnimalEars(ctx, landmarks, canvas.width, canvas.height, 'bear');
            break;
          case 'crown':
            drawCrown(ctx, landmarks, canvas.width, canvas.height);
            break;
          case 'hearts':
            drawHearts(ctx, landmarks, canvas.width, canvas.height, timeRef.current);
            break;
          case 'sparkles':
            drawSparkles(ctx, landmarks, canvas.width, canvas.height, timeRef.current);
            break;
          case 'glitch':
            drawGlitch(ctx, canvas.width, canvas.height, timeRef.current);
            break;
          case 'fire':
            drawFire(ctx, landmarks, canvas.width, canvas.height, timeRef.current);
            break;
          case 'cartoon':
            drawCartoonEffect(ctx, canvas.width, canvas.height);
            break;
          case 'anime':
            drawAnimeEffect(ctx, canvas.width, canvas.height);
            break;
          case 'vampire':
            drawVampireEffect(ctx, landmarks, canvas.width, canvas.height);
            break;
        }
      }
    }
    
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [videoRef, activeEffect]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

// ============ FONCTIONS UTILITAIRES ============

function getFaceBounds(landmarks: NormalizedLandmark[]): {
  left: number; right: number; top: number; bottom: number;
  centerX: number; centerY: number;
} {
  let left = 1, right = 0, top = 1, bottom = 0;
  landmarks.forEach(lm => {
    left = Math.min(left, lm.x);
    right = Math.max(right, lm.x);
    top = Math.min(top, lm.y);
    bottom = Math.max(bottom, lm.y);
  });
  return {
    left, right, top, bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function drawEyeEnlargement(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  intensity: number
) {
  const leftEye = FACE_LANDMARKS.leftEye;
  const rightEye = FACE_LANDMARKS.rightEye;
  
  const leftCenter = getCenter(leftEye.map(i => landmarks[i]));
  const rightCenter = getCenter(rightEye.map(i => landmarks[i]));
  
  const leftEyeWidth = distance(landmarks[leftEye[0]], landmarks[leftEye[8]]);
  const rightEyeWidth = distance(landmarks[rightEye[0]], landmarks[rightEye[8]]);
  
  const expand = 1 + intensity * 0.3;
  
  // Halo lumineux autour des yeux
  ctx.save();
  const glowSize = leftEyeWidth * expand * canvasWidth * 2;
  
  const leftGlow = ctx.createRadialGradient(
    leftCenter.x * canvasWidth, leftCenter.y * canvasHeight, 0,
    leftCenter.x * canvasWidth, leftCenter.y * canvasHeight, glowSize
  );
  leftGlow.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.15})`);
  leftGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = leftGlow;
  ctx.beginPath();
  ctx.arc(leftCenter.x * canvasWidth, leftCenter.y * canvasHeight, glowSize, 0, 2 * Math.PI);
  ctx.fill();
  
  const rightGlow = ctx.createRadialGradient(
    rightCenter.x * canvasWidth, rightCenter.y * canvasHeight, 0,
    rightCenter.x * canvasWidth, rightCenter.y * canvasHeight, glowSize
  );
  rightGlow.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.15})`);
  rightGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rightGlow;
  ctx.beginPath();
  ctx.arc(rightCenter.x * canvasWidth, rightCenter.y * canvasHeight, glowSize, 0, 2 * Math.PI);
  ctx.fill();
  
  // Redessiner les yeux plus grands
  ctx.globalAlpha = intensity * 0.5;
  ctx.fillStyle = '#ffffff';
  
  [leftCenter, rightCenter].forEach(center => {
    const eyeRadius = leftEyeWidth * expand * canvasWidth * 0.6;
    ctx.beginPath();
    ctx.ellipse(
      center.x * canvasWidth,
      center.y * canvasHeight,
      eyeRadius,
      eyeRadius * 0.7,
      0, 0, 2 * Math.PI
    );
    ctx.fill();
  });
  
  ctx.restore();
}

function drawFaceSlimming(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  intensity: number
) {
  const faceBounds = getFaceBounds(landmarks);
  const cx = faceBounds.centerX * canvasWidth;
  const cy = faceBounds.centerY * canvasHeight;
  const halfWidth = (faceBounds.right - faceBounds.left) * canvasWidth / 2;
  const halfHeight = (faceBounds.bottom - faceBounds.top) * canvasHeight / 2;
  
  // Réduire la largeur du visage avec un overlay sombre sur les côtés
  const slimAmount = intensity * halfWidth * 0.3;
  
  ctx.save();
  
  // Overlay sombre gauche
  const leftGrad = ctx.createLinearGradient(
    (faceBounds.centerX - faceBounds.left) * canvasWidth, 0,
    0, 0
  );
  leftGrad.addColorStop(0, 'rgba(0,0,0,0)');
  leftGrad.addColorStop(1, `rgba(0,0,0,${intensity * 0.4})`);
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, (faceBounds.top) * canvasHeight, (faceBounds.centerX - faceBounds.left) * canvasWidth, (faceBounds.bottom - faceBounds.top) * canvasHeight);
  
  // Overlay sombre droit
  const rightGrad = ctx.createLinearGradient(
    canvasWidth, 0,
    (faceBounds.centerX - faceBounds.left) * canvasWidth, 0
  );
  rightGrad.addColorStop(0, `rgba(0,0,0,${intensity * 0.4})`);
  rightGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(0, (faceBounds.top) * canvasHeight, canvasWidth, (faceBounds.bottom - faceBounds.top) * canvasHeight);
  
  ctx.restore();
}

function drawLipEnhancement(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  intensity: number
) {
  const allLipPoints = [...FACE_LANDMARKS.upperLip, ...FACE_LANDMARKS.lowerLip];
  const lipCenter = getCenter(allLipPoints.map(i => landmarks[i]));
  
  const lx = lipCenter.x * canvasWidth;
  const ly = lipCenter.y * canvasHeight;
  
  const lipWidth = Math.abs(
    distance(landmarks[FACE_LANDMARKS.upperLip[0]], landmarks[FACE_LANDMARKS.upperLip[10]])
  ) * canvasWidth * (1 + intensity * 0.2);
  
  ctx.save();
  ctx.globalAlpha = intensity * 0.3;
  const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, lipWidth);
  gradient.addColorStop(0, `rgba(255, 150, 150, ${intensity * 0.4})`);
  gradient.addColorStop(1, 'rgba(255, 150, 150, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(lx, ly, lipWidth, lipWidth * 0.5, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawCartoonEffect(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  // Effet posterize via overlay
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

function drawAnimeEffect(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#667eea';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

function drawVampireEffect(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number
) {
  // Crocs
  const upperLipCenter = getCenter(FACE_LANDMARKS.upperLip.map(i => landmarks[i]));
  const cx = upperLipCenter.x * canvasWidth;
  const cy = upperLipCenter.y * canvasHeight;
  
  ctx.save();
  ctx.fillStyle = '#ffffff';
  
  // Croc gauche
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx - 8, cy + 15);
  ctx.lineTo(cx - 4, cy);
  ctx.fill();
  
  // Croc droit
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 8, cy + 15);
  ctx.lineTo(cx + 12, cy);
  ctx.fill();
  
  ctx.restore();
}

function getFilterOverlayColor(filter: string): string {
  if (filter.includes('hue-rotate(180')) return 'rgba(0, 100, 255, 0.1)';
  if (filter.includes('hue-rotate(-20') || filter.includes('hue-rotate(-30')) return 'rgba(255, 200, 0, 0.1)';
  if (filter.includes('saturate(2')) return 'rgba(255, 0, 255, 0.1)';
  if (filter.includes('sepia')) return 'rgba(200, 150, 50, 0.1)';
  if (filter.includes('grayscale')) return 'rgba(128, 128, 128, 0.1)';
  return 'rgba(255, 255, 255, 0.05)';
}

function getOverlayGradient(filter: string): [string, string] {
  if (filter.includes('hue-rotate(180')) return ['rgba(0, 100, 255, 0.15)', 'rgba(0, 200, 255, 0.1)'];
  if (filter.includes('hue-rotate(-20') || filter.includes('hue-rotate(-30')) return ['rgba(255, 200, 0, 0.15)', 'rgba(255, 100, 0, 0.1)'];
  if (filter.includes('saturate(2')) return ['rgba(255, 0, 255, 0.15)', 'rgba(0, 255, 255, 0.1)'];
  if (filter.includes('sepia')) return ['rgba(200, 150, 50, 0.15)', 'rgba(150, 100, 30, 0.1)'];
  if (filter.includes('grayscale')) return ['rgba(100, 100, 100, 0.1)', 'rgba(150, 150, 150, 0.1)'];
  if (filter.includes('contrast(1.4')) return ['rgba(0, 0, 50, 0.15)', 'rgba(50, 0, 0, 0.1)'];
  return ['rgba(255, 255, 255, 0.05)', 'rgba(200, 200, 255, 0.05)'];
}

export default AREngine;
