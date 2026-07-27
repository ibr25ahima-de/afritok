/**
 * AR Engine - Moteur de réalité augmentée pour effets faciaux en temps réel
 * Utilise MediaPipe FaceLandmarker (468 landmarks) pour appliquer de vrais
 * effets de morphing facial : peau lisse, yeux agrandis, visage affiné, etc.
 * 
 * Technique : On dessine la vidéo frame par frame sur un canvas,
 * puis on applique des transformations sur les zones du visage détectées.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from './EffectsPanel';

interface AREngineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  activeFilter?: { id: string; cssFilter: string } | null;
  isRecording?: boolean;
}

/**
 * Indices clés des landmarks MediaPipe FaceMesh (468 points)
 */
const LANDMARKS = {
  // Contour complet du visage
  faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  // Front
  forehead: [10, 67, 109, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
  // Yeux
  leftEyeTop: [159, 158, 157, 173],
  leftEyeBottom: [145, 153, 154, 155],
  leftEyeOuter: [33, 246],
  rightEyeTop: [386, 385, 384, 398],
  rightEyeBottom: [374, 380, 381, 382],
  rightEyeOuter: [263, 466],
  leftEyeAll: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEyeAll: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  // Lèvres
  upperLipTop: [13, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  upperLipBottom: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  lowerLipTop: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  lowerLipBottom: [11, 12, 86, 177, 85, 96, 180, 314, 405, 321, 375],
  allLips: [13, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375, 11, 12, 86, 177, 85, 96, 180],
  // Nez
  noseTip: [1],
  noseBottom: [2, 98, 327],
  noseBridge: [6, 197, 195, 5, 4],
  // Menton
  chin: [152],
  // Joues
  leftCheek: [205, 187, 214, 186, 143, 58],
  rightCheek: [425, 407, 434, 406, 372, 288],
  // Sourcils
  leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  // Sides du visage (pour slim)
  leftJaw: [234, 127, 162, 21, 54, 103, 67, 109],
  rightJaw: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152],
};

function center(lms: NormalizedLandmark[]): { x: number; y: number } {
  if (!lms.length) return { x: 0, y: 0 };
  const s = lms.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
  return { x: s.x / lms.length, y: s.y / lms.length };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function faceBounds(lms: NormalizedLandmark[]) {
  let left = 1, right = 0, top = 1, bottom = 0;
  lms.forEach(l => {
    left = Math.min(left, l.x);
    right = Math.max(right, l.x);
    top = Math.min(top, l.y);
    bottom = Math.max(bottom, l.y);
  });
  return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2, w: right - left, h: bottom - top };
}

export const AREngine: React.FC<AREngineProps> = ({ videoRef, activeEffect, activeFilter, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastLmsRef = useRef<NormalizedLandmark[] | null>(null);
  const smoothingRef = useRef(0.3); // Factor de lissage des landmarks

  // Init FaceLandmarker
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (!cancelled) landmarkerRef.current = lm;
      } catch (err) {
        console.error("AR Engine init failed:", err);
      }
    };
    init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
    };
  }, []);

  // Lissage des landmarks (interpolation pour éviter le jitter)
  const smoothLandmarks = useCallback((newLms: NormalizedLandmark[]): NormalizedLandmark[] => {
    const prev = lastLmsRef.current;
    if (!prev) {
      lastLmsRef.current = newLms;
      return newLms;
    }
    const alpha = smoothingRef.current;
    return newLms.map((nlm, i) => ({
      x: nlm.x * alpha + prev[i].x * (1 - alpha),
      y: nlm.y * alpha + prev[i].y * (1 - alpha),
      z: nlm.z,
    }));
  }, []);

  // Boucle principale
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;

    if (!video || !canvas || !lm) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Attendre que la vidéo soit prête
    if (video.readyState !== 4 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Si pas d'effet et pas de filtre, on ne dessine rien (la vidéo se voit directement)
    if (!activeEffect && !activeFilter) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Dessiner la frame vidéo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Détecter le visage
    let landmarks: NormalizedLandmark[] = [];
    let faceB: ReturnType<typeof faceBounds> | null = null;

    try {
      const results = lm.detectForVideo(video, performance.now());
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        landmarks = smoothLandmarks(results.faceLandmarks[0]);
        faceB = faceBounds(landmarks);
      }
    } catch (e) {
      // Silencieux si pas de détection
    }

    // ============ EFFETS BEAUTÉ ============
    if (activeEffect?.beautyConfig) {
      const cfg = activeEffect.beautyConfig;
      const cw = canvas.width;
      const ch = canvas.height;

      // --- 1. SMOOTH SKIN (Lissage de peau) ---
      if (cfg.smoothSkin && cfg.smoothSkin > 0) {
        if (faceB) {
          const pad = cfg.smoothSkin * 0.05;
          const x = Math.max(0, (faceB.left - pad) * cw);
          const y = Math.max(0, (faceB.top - pad) * ch);
          const w = (faceB.w + pad * 2) * cw;
          const h = (faceB.h + pad * 2) * ch;

          // Passe 1 : blur léger de la zone du visage
          ctx.save();
          ctx.filter = `blur(${cfg.smoothSkin * 8}px)`;
          ctx.globalAlpha = 0.5;
          ctx.drawImage(video, x, y, w, h, x, y, w, h);
          ctx.restore();
          // Passe 2 : deuxième couche de blur pour intensifier le lissage
          ctx.save();
          ctx.filter = `blur(${cfg.smoothSkin * 5}px)`;
          ctx.globalAlpha = 0.35;
          ctx.drawImage(video, x, y, w, h, x, y, w, h);
          ctx.restore();

          // Overlay lumineux pour éclaircir la peau
          if (cfg.brightenSkin && cfg.brightenSkin > 0) {
            ctx.save();
            ctx.globalAlpha = cfg.brightenSkin * 0.55;
            const gradient = ctx.createRadialGradient(
              faceB.cx * cw, faceB.cy * ch, 0,
              faceB.cx * cw, faceB.cy * ch, faceB.w * cw * 0.55
            );
            gradient.addColorStop(0, 'rgba(255, 245, 235, 0.85)');
            gradient.addColorStop(0.5, 'rgba(255, 240, 225, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 235, 220, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, cw, ch);
            ctx.restore();
          }
        }
      }

      // --- 2. ENLARGE EYES (Yeux agrandis) ---
      if (cfg.enlargeEyes && cfg.enlargeEyes > 0) {
        const leftEye = LANDMARKS.leftEyeAll.map(i => landmarks[i]);
        const rightEye = LANDMARKS.rightEyeAll.map(i => landmarks[i]);
        
        const leftC = center(leftEye);
        const rightC = center(rightEye);
        
        const leftW = dist(leftEye[0], leftEye[8]) * cw;
        const rightW = dist(rightEye[0], rightEye[8]) * cw;
        
        const factor = 1 + cfg.enlargeEyes * 0.6;
        const glowRadius = Math.max(leftW, rightW) * factor * 3.5;

        ctx.save();
        
        // Glow blanc INTENSE autour des yeux
        [leftC, rightC].forEach((c, idx) => {
          const r = idx === 0 ? leftW : rightW;
          const glow = ctx.createRadialGradient(
            c.x * cw, c.y * ch, 0,
            c.x * cw, c.y * ch, glowRadius
          );
          glow.addColorStop(0, `rgba(255, 255, 255, ${cfg.enlargeEyes * 0.7})`);
          glow.addColorStop(0.2, `rgba(255, 255, 255, ${cfg.enlargeEyes * 0.5})`);
          glow.addColorStop(0.5, `rgba(255, 255, 255, ${cfg.enlargeEyes * 0.25})`);
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(c.x * cw, c.y * ch, glowRadius, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Redessiner la zone des yeux avec un fort agrandissement
        [leftC, rightC].forEach((c, idx) => {
          const r = idx === 0 ? leftW : rightW;
          const scaleX = factor;
          const scaleY = factor * 0.9;
          
          ctx.save();
          ctx.globalAlpha = cfg.enlargeEyes * 0.55;
          ctx.translate(c.x * cw, c.y * ch);
          ctx.scale(scaleX, scaleY);
          ctx.translate(-c.x * cw, -c.y * ch);
          // Redessiner la zone des yeux à partir de la vidéo
          ctx.drawImage(
            video,
            (c.x - r * 1.5 / cw) * cw, (c.y - r * 1.2 / ch) * ch,
            r * 3, r * 2.4,
            (c.x - r * 1.5 / cw) * cw, (c.y - r * 1.2 / ch) * ch,
            r * 3, r * 2.4
          );
          ctx.restore();
        });

        ctx.restore();
      }

      // --- 3. SLIM FACE (Affiner le visage) ---
      if (cfg.slimFace && cfg.slimFace > 0) {
        if (faceB) {
          ctx.save();
          const edgeFade = cfg.slimFace * 0.9;
          
          // Assombrir fortement les bords gauche du visage
          const leftGrad = ctx.createLinearGradient(
            faceB.left * cw, 0,
            (faceB.left + faceB.w * 0.3) * cw, 0
          );
          leftGrad.addColorStop(0, `rgba(0, 0, 0, ${edgeFade})`);
          leftGrad.addColorStop(0.5, `rgba(0, 0, 0, ${edgeFade * 0.6})`);
          leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = leftGrad;
          ctx.fillRect(faceB.left * cw, faceB.top * ch, faceB.w * 0.3 * cw, faceB.h * ch);

          // Assombrir fortement les bords droit du visage
          const rightGrad = ctx.createLinearGradient(
            (faceB.right - faceB.w * 0.3) * cw, 0,
            faceB.right * cw, 0
          );
          rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          rightGrad.addColorStop(0.5, `rgba(0, 0, 0, ${edgeFade * 0.6})`);
          rightGrad.addColorStop(1, `rgba(0, 0, 0, ${edgeFade})`);
          ctx.fillStyle = rightGrad;
          ctx.fillRect((faceB.right - faceB.w * 0.3) * cw, faceB.top * ch, faceB.w * 0.3 * cw, faceB.h * ch);

          // Assombrir aussi le haut et le bas du visage pour effet V-shape
          const topGrad = ctx.createLinearGradient(0, faceB.top * ch, 0, (faceB.top + faceB.h * 0.15) * ch);
          topGrad.addColorStop(0, `rgba(0, 0, 0, ${edgeFade * 0.5})`);
          topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = topGrad;
          ctx.fillRect(faceB.left * cw, faceB.top * ch, faceB.w * cw, faceB.h * 0.15 * ch);

          const bottomGrad = ctx.createLinearGradient(0, (faceB.bottom - faceB.h * 0.2) * ch, 0, faceB.bottom * ch);
          bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          bottomGrad.addColorStop(1, `rgba(0, 0, 0, ${edgeFade * 0.4})`);
          ctx.fillStyle = bottomGrad;
          ctx.fillRect(faceB.left * cw, (faceB.bottom - faceB.h * 0.2) * ch, faceB.w * cw, faceB.h * 0.2 * ch);

          // Highlight central INTENSE (rend le milieu du visage très lumineux)
          const centerGlow = ctx.createRadialGradient(
            faceB.cx * cw, faceB.cy * ch, 0,
            faceB.cx * cw, faceB.cy * ch, faceB.w * cw * 0.4
          );
          centerGlow.addColorStop(0, `rgba(255, 245, 235, ${cfg.slimFace * 0.35})`);
          centerGlow.addColorStop(0.5, `rgba(255, 245, 235, ${cfg.slimFace * 0.15})`);
          centerGlow.addColorStop(1, 'rgba(255, 245, 235, 0)');
          ctx.fillStyle = centerGlow;
          ctx.fillRect(0, 0, cw, ch);

          ctx.restore();
        }
      }

      // --- 4. WHITEN TEETH (Dents blanches) ---
      if (cfg.whitenTeeth && cfg.whitenTeeth > 0) {
        const lipPoints = LANDMARKS.allLips.map(i => landmarks[i]);
        const lipC = center(lipPoints);
        const mx = lipC.x * cw;
        const my = lipC.y * ch;
        const mouthW = dist(landmarks[61], landmarks[291]) * cw;
        
        ctx.save();
        ctx.globalAlpha = cfg.whitenTeeth * 0.85;
        const whitenGlow = ctx.createRadialGradient(mx, my, 0, mx, my, mouthW * 0.6);
        whitenGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        whitenGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        whitenGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = whitenGlow;
        ctx.fillRect(mx - mouthW, my - mouthW * 0.5, mouthW * 2, mouthW);
        ctx.restore();
      }

      // --- 5. ENLARGE LIPS (Lèvres pulpeuses) ---
      if (cfg.enlargeLips && cfg.enlargeLips > 0) {
        const lipPoints = LANDMARKS.allLips.map(i => landmarks[i]);
        const lipC = center(lipPoints);
        const lx = lipC.x * cw;
        const ly = lipC.y * ch;
        const lipW = dist(landmarks[61], landmarks[291]) * cw;
        
        ctx.save();
        // Halo rose INTENSE autour des lèvres
        const lipHalo = ctx.createRadialGradient(lx, ly, 0, lx, ly, lipW * 0.9);
        lipHalo.addColorStop(0, `rgba(255, 120, 120, ${cfg.enlargeLips * 0.65})`);
        lipHalo.addColorStop(0.4, `rgba(255, 130, 130, ${cfg.enlargeLips * 0.35})`);
        lipHalo.addColorStop(1, 'rgba(255, 130, 130, 0)');
        ctx.fillStyle = lipHalo;
        ctx.fillRect(lx - lipW, ly - lipW * 0.5, lipW * 2, lipW);
        ctx.restore();
      }

      // --- 6. SYMMETRY (Symétrie) ---
      if (cfg.symmetry && cfg.symmetry > 0) {
        if (faceB) {
          ctx.save();
          // Overlay de symétrie : miroir horizontal léger
          const cx = faceB.cx * cw;
          ctx.globalAlpha = cfg.symmetry * 0.5;
          
          // Copier le côté droit sur le gauche et vice versa (effet miroir subtil)
          ctx.translate(cx, 0);
          ctx.scale(-1, 1);
          ctx.translate(-cx, 0);
          ctx.drawImage(video, 0, 0, cw, ch, 0, 0, cw, ch);
          ctx.restore();
        }
      }
    }

    // ============ EFFETS VISUELS ============
    if (activeEffect?.visualConfig) {
      const vCfg = activeEffect.visualConfig;
      const cw = canvas.width;
      const ch = canvas.height;

      // Overlay coloré global
      if (vCfg.filter && vCfg.intensity) {
        ctx.save();
        ctx.globalAlpha = vCfg.intensity * 0.5;
        
        // Interpréter le filtre et appliquer un overlay coloré INTENSE
        if (vCfg.filter.includes('hue-rotate(180')) {
          ctx.fillStyle = 'rgba(0, 80, 200, 0.45)';
        } else if (vCfg.filter.includes('hue-rotate(-20') || vCfg.filter.includes('hue-rotate(-30')) {
          ctx.fillStyle = 'rgba(255, 180, 0, 0.45)';
        } else if (vCfg.filter.includes('saturate(2')) {
          const hue = Math.sin(timeRef.current * 0.5) * 30;
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
        } else if (vCfg.filter.includes('sepia')) {
          ctx.fillStyle = 'rgba(180, 140, 60, 0.4)';
        } else if (vCfg.filter.includes('grayscale')) {
          ctx.fillStyle = 'rgba(100, 100, 100, 0.35)';
        } else if (vCfg.filter.includes('contrast(1.4')) {
          ctx.fillStyle = 'rgba(30, 0, 60, 0.3)';
        } else if (vCfg.filter.includes('brightness(1.15') || vCfg.filter.includes('brightness(1.2')) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        } else {
          ctx.fillStyle = 'rgba(200, 200, 255, 0.25)';
        }
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }

      // Overlays spécifiques basés sur le type
      if (vCfg.overlay && faceB && landmarks.length > 0) {
        const cw = canvas.width;
        const ch = canvas.height;
        
        switch (vCfg.overlay) {
          // === ANIMAL EARS ===
          case 'cat-ears':
          case 'dog-ears':
          case 'rabbit-ears':
          case 'bear-ears': {
            const animalType = vCfg.overlay.replace('-ears', '') as 'cat' | 'dog' | 'rabbit' | 'bear';
            const browLeft = LANDMARKS.leftBrow.map(i => landmarks[i]);
            const browRight = LANDMARKS.rightBrow.map(i => landmarks[i]);
            const bLC = center(browLeft);
            const bRC = center(browRight);
            
            const earW = dist(bLC, bRC) * cw * 0.45;
            const earH = animalType === 'rabbit' ? earW * 4 : earW * 2.2;
            const earOffset = animalType === 'rabbit' ? earH * 0.55 : earH * 0.4;
            
            const colors: Record<string, { outer: string; inner: string }> = {
              cat: { outer: '#4a4a4a', inner: '#ff9999' },
              dog: { outer: '#8B6914', inner: '#CD853F' },
              rabbit: { outer: '#f5f5f5', inner: '#ffb7c1' },
              bear: { outer: '#5c3a21', inner: '#8B6914' },
            };
            const c = colors[animalType];
            
            ctx.save();
            // Oreille gauche - plus grande
            ctx.beginPath();
            ctx.ellipse(bLC.x * cw - earW * 0.25, bLC.y * ch - earOffset, earW * 0.85, earH, -0.3, 0, 2 * Math.PI);
            ctx.fillStyle = c.outer;
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bLC.x * cw - earW * 0.25, bLC.y * ch - earOffset, earW * 0.45, earH * 0.6, -0.3, 0, 2 * Math.PI);
            ctx.fillStyle = c.inner;
            ctx.fill();
            
            // Oreille droite - plus grande
            ctx.beginPath();
            ctx.ellipse(bRC.x * cw + earW * 0.25, bRC.y * ch - earOffset, earW * 0.85, earH, 0.3, 0, 2 * Math.PI);
            ctx.fillStyle = c.outer;
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bRC.x * cw + earW * 0.25, bRC.y * ch - earOffset, earW * 0.45, earH * 0.6, 0.3, 0, 2 * Math.PI);
            ctx.fillStyle = c.inner;
            ctx.fill();
            
            // Nez d'animal - plus grand
            const noseC = center(LANDMARKS.noseTip.map(i => landmarks[i]));
            ctx.beginPath();
            ctx.ellipse(noseC.x * cw, noseC.y * ch + 20 * ch / 720, 10 * cw / 1280, 7 * ch / 720, 0, 0, 2 * Math.PI);
            ctx.fillStyle = animalType === 'rabbit' ? '#ffb7c1' : '#1a1a1a';
            ctx.fill();
            
            ctx.restore();
            break;
          }
          
          // === CROWN ===
          case 'crown': {
            const browAll = [...LANDMARKS.leftBrow, ...LANDMARKS.rightBrow].map(i => landmarks[i]);
            const bC = center(browAll);
            const cx = bC.x * cw;
            const cy = bC.y * ch;
            const cw2 = dist(landmarks[70], landmarks[300]) * cw;
            
            ctx.save();
            // Dessiner la couronne
            const points = [
              { x: cx - cw2 * 0.4, y: cy - cw2 * 0.15 },
              { x: cx - cw2 * 0.35, y: cy - cw2 * 0.45 },
              { x: cx - cw2 * 0.2, y: cy - cw2 * 0.15 },
              { x: cx, y: cy - cw2 * 0.5 },
              { x: cx + cw2 * 0.2, y: cy - cw2 * 0.15 },
              { x: cx + cw2 * 0.35, y: cy - cw2 * 0.45 },
              { x: cx + cw2 * 0.4, y: cy - cw2 * 0.15 },
            ];
            
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.strokeStyle = '#B8860B';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Joyaux
            [[cx, cy - cw2 * 0.35, '#FF0000'], [cx - cw2 * 0.15, cy - cw2 * 0.2, '#00FF00'], [cx + cw2 * 0.15, cy - cw2 * 0.2, '#0066FF']].forEach(([x, y, color]) => {
              ctx.beginPath();
              ctx.arc(x as number, y as number, cw2 * 0.04, 0, 2 * Math.PI);
              ctx.fillStyle = color as string;
              ctx.fill();
            });
            ctx.restore();
            break;
          }
          
          // === HEARTS ===
          case 'hearts': {
            const fc = center([landmarks[10], landmarks[152]]);
            ctx.save();
            const heartEmojis = ['❤️', '💕', '💗', '💖', '🩷'];
            for (let i = 0; i < 15; i++) {
              const angle = (i / 15) * Math.PI * 2 + timeRef.current * 0.8;
              const radius = faceB!.w * cw * (0.3 + 0.15 * Math.sin(timeRef.current * 3 + i));
              const hx = fc.x * cw + Math.cos(angle) * radius;
              const hy = fc.y * ch + Math.sin(angle) * radius;
              const size = 24 + 8 * Math.sin(timeRef.current * 3 + i);
              ctx.font = `${size}px serif`;
              ctx.globalAlpha = 0.7 + 0.3 * Math.sin(timeRef.current * 2 + i);
              ctx.fillText(heartEmojis[i % heartEmojis.length], hx - size / 2, hy);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            break;
          }
          
          // === SPARKLES ===
          case 'sparkles': {
            const sparklePts = [
              landmarks[10], landmarks[152], landmarks[1],
              landmarks[33], landmarks[263], landmarks[205], landmarks[425],
            ];
            ctx.save();
            sparklePts.forEach((pt, i) => {
              const x = pt.x * cw;
              const y = pt.y * ch;
              const alpha = 0.7 + 0.3 * Math.abs(Math.sin(timeRef.current * 3 + i * 1.5));
              const size = 8 + 6 * Math.abs(Math.sin(timeRef.current * 2 + i));
              
              ctx.globalAlpha = alpha;
              ctx.fillStyle = '#FFD700';
              // Étoile à 4 branches
              ctx.beginPath();
              for (let j = 0; j < 4; j++) {
                const a = (j * Math.PI) / 2 + timeRef.current;
                const px = x + Math.cos(a) * size;
                const py = y + Math.sin(a) * size;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              
              // Halo
              const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
              halo.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.3})`);
              halo.addColorStop(1, 'rgba(255, 215, 0, 0)');
              ctx.fillStyle = halo;
              ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);
            });
            ctx.globalAlpha = 1;
            ctx.restore();
            break;
          }
          
          // === GLITCH ===
          case 'glitch': {
            if (Math.random() > 0.35) {
              ctx.save();
              const sliceH = 5 + Math.random() * 30;
              const sliceY = Math.random() * ch;
              const offsetX = (Math.random() - 0.5) * 50;
              ctx.globalCompositeOperation = 'source-over';
              const imgData = ctx.getImageData(0, sliceY, cw, sliceH);
              ctx.putImageData(imgData, offsetX, sliceY);
              ctx.restore();
              ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,0,0.25)' : 'rgba(0,255,255,0.25)';
              ctx.fillRect(0, sliceY, cw, sliceH);
            }
            break;
          }
          
          // === FIRE ===
          case 'fire': {
            ctx.save();
            const jawPts = LANDMARKS.faceOval.slice(10, 27).map(i => landmarks[i]);
            for (let i = 0; i < 50; i++) {
              const pt = jawPts[i % jawPts.length];
              const x = pt.x * cw + (Math.random() - 0.5) * 60;
              const y = pt.y * ch + Math.random() * 40;
              const size = 6 + Math.random() * 15;
              const a = 0.4 + Math.random() * 0.5;
              
              const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
              grad.addColorStop(0, `rgba(255, 200, 0, ${a})`);
              grad.addColorStop(0.4, `rgba(255, 80, 0, ${a * 0.6})`);
              grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(x, y - Math.sin(timeRef.current * 4 + i) * 5, size, 0, 2 * Math.PI);
              ctx.fill();
            }
            ctx.restore();
            break;
          }
          
          // === VAMPIRE ===
          case 'vampire': {
            const lipC = center(LANDMARKS.allLips.map(i => landmarks[i]));
            const cx = lipC.x * cw;
            const cy = lipC.y * ch;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            // Croc gauche - plus grand
            ctx.beginPath();
            ctx.moveTo(cx - 15 * cw / 1280, cy - 3 * ch / 720);
            ctx.lineTo(cx - 8 * cw / 1280, cy + 22 * ch / 720);
            ctx.lineTo(cx - 1 * cw / 1280, cy - 3 * ch / 720);
            ctx.fill();
            // Croc droit - plus grand
            ctx.beginPath();
            ctx.moveTo(cx + 1 * cw / 1280, cy - 3 * ch / 720);
            ctx.lineTo(cx + 8 * cw / 1280, cy + 22 * ch / 720);
            ctx.lineTo(cx + 15 * cw / 1280, cy - 3 * ch / 720);
            ctx.fill();
            ctx.restore();
            break;
          }
          
          // === ALIEN ===
          case 'alien': {
            const eyeL = center(LANDMARKS.leftEyeAll.map(i => landmarks[i]));
            const eyeR = center(LANDMARKS.rightEyeAll.map(i => landmarks[i]));
            ctx.save();
            // Yeux verts lumineux INTENSES
            [eyeL, eyeR].forEach(e => {
              // Halo extérieur
              const outerGrad = ctx.createRadialGradient(
                e.x * cw, e.y * ch, 0,
                e.x * cw, e.y * ch, 40 * cw / 1280
              );
              outerGrad.addColorStop(0, 'rgba(0, 255, 100, 0.7)');
              outerGrad.addColorStop(0.4, 'rgba(0, 255, 100, 0.3)');
              outerGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
              ctx.fillStyle = outerGrad;
              ctx.beginPath();
              ctx.arc(e.x * cw, e.y * ch, 40 * cw / 1280, 0, 2 * Math.PI);
              ctx.fill();
              // Centre brillant
              const innerGrad = ctx.createRadialGradient(
                e.x * cw, e.y * ch, 0,
                e.x * cw, e.y * ch, 15 * cw / 1280
              );
              innerGrad.addColorStop(0, 'rgba(100, 255, 150, 0.9)');
              innerGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
              ctx.fillStyle = innerGrad;
              ctx.beginPath();
              ctx.arc(e.x * cw, e.y * ch, 15 * cw / 1280, 0, 2 * Math.PI);
              ctx.fill();
            });
            ctx.restore();
            break;
          }
          
          // === GHOST ===
          case 'ghost': {
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.15 * Math.sin(timeRef.current * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.restore();
            break;
          }
          
          // === CLOWN ===
          case 'clown': {
            const noseC = center(LANDMARKS.noseTip.map(i => landmarks[i]));
            ctx.save();
            // Nez rouge
            const grad = ctx.createRadialGradient(
              noseC.x * cw, noseC.y * ch, 0,
              noseC.x * cw, noseC.y * ch, 20 * cw / 1280
            );
            grad.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
            grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(noseC.x * cw, noseC.y * ch, 20 * cw / 1280, 0, 2 * Math.PI);
            ctx.fill();
            
            // Lignes de sourire
            const lipC = center(LANDMARKS.allLips.map(i => landmarks[i]));
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo((lipC.x - 0.08) * cw, lipC.y * ch + 5);
            ctx.quadraticCurveTo(lipC.x * cw, (lipC.y + 0.06) * ch, (lipC.x + 0.08) * cw, lipC.y * ch + 5);
            ctx.stroke();
            ctx.restore();
            break;
          }
          
          // === CARTOON ===
          case 'cartoon': {
            // Contour noir épais autour du visage
            if (faceB) {
              ctx.save();
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.lineWidth = 6;
              ctx.beginPath();
              LANDMARKS.faceOval.forEach((idx, i) => {
                const pt = landmarks[idx];
                if (i === 0) ctx.moveTo(pt.x * cw, pt.y * ch);
                else ctx.lineTo(pt.x * cw, pt.y * ch);
              });
              ctx.closePath();
              ctx.stroke();
              ctx.restore();
            }
            break;
          }
          
          // === ANIME ===
          case 'anime': {
            // Yeux brillants anime
            if (faceB) {
              const eyeL = center(LANDMARKS.leftEyeAll.map(i => landmarks[i]));
              const eyeR = center(LANDMARKS.rightEyeAll.map(i => landmarks[i]));
              ctx.save();
              [eyeL, eyeR].forEach(e => {
                const grad = ctx.createRadialGradient(
                  e.x * cw - 5, e.y * ch - 5, 0,
                  e.x * cw, e.y * ch, 18 * cw / 1280
                );
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                grad.addColorStop(0.4, 'rgba(200, 220, 255, 0.4)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(e.x * cw, e.y * ch, 28 * cw / 1280, 0, 2 * Math.PI);
                ctx.fill();
              });
              ctx.restore();
            }
            break;
          }
          
          // === POP ART ===
          case 'pop-art': {
            if (faceB) {
              ctx.save();
              ctx.globalAlpha = 0.25;
              // Points de halftone
              for (let y = 0; y < ch; y += 8) {
                for (let x = 0; x < cw; x += 8) {
                  ctx.beginPath();
                  ctx.arc(x, y, 2, 0, 2 * Math.PI);
                  ctx.fillStyle = Math.random() > 0.5 ? '#FF0066' : '#0066FF';
                  ctx.fill();
                }
              }
              ctx.restore();
            }
            break;
          }
          
          // === PIXEL ===
          case 'pixel': {
            ctx.save();
            ctx.globalAlpha = 0.4;
            const pixelSize = 8;
            for (let y = 0; y < ch; y += pixelSize * 2) {
              for (let x = 0; x < cw; x += pixelSize * 2) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                ctx.fillRect(x, y, pixelSize, pixelSize);
              }
            }
            ctx.restore();
            break;
          }
          
          // === TRIPPY ===
          case 'trippy': {
            if (faceB) {
              ctx.save();
              ctx.globalAlpha = 0.3;
              for (let ring = 1; ring <= 8; ring++) {
                const radius = faceB.w * cw * 0.12 * ring;
                const hue = (timeRef.current * 100 + ring * 45) % 360;
                ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(faceB.cx * cw, faceB.cy * ch, radius, 0, 2 * Math.PI);
                ctx.stroke();
              }
              ctx.restore();
            }
            break;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }, [videoRef, activeEffect, activeFilter, smoothLandmarks]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
};

export default AREngine;
