/**
 * AREngine
 *
 * Moteur principal du système Beauté IA.
 *
 * Les traitements beauté sont séparés dans beautyEffects.ts
 * et les fonctions MediaPipe dans faceUtils.ts.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  FaceLandmarker,
  FilesetResolver,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import type { AREffect } from "./EffectsPanel";

import {
  applyBeautyEffects,
} from "./beautyEffects";

import {
  smoothLandmarks,
} from "./faceUtils";

interface AREngineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording?: boolean;
}

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export const AREngine: React.FC<
  AREngineProps
> = ({
  videoRef,
  activeEffect,
}) => {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const landmarkerRef =
    useRef<FaceLandmarker | null>(null);

  const animationRef =
    useRef<number | null>(null);

  const previousLandmarksRef =
    useRef<NormalizedLandmark[] | null>(
      null
    );

  const lastDetectionTimeRef =
    useRef(0);

  const lastWidthRef =
    useRef(0);

  const lastHeightRef =
    useRef(0);

  const frameCounterRef =
    useRef(0);

  const initializingRef =
    useRef(false);

  /**
   * Initialise MediaPipe une seule fois.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (initializingRef.current) {
        return;
      }

      initializingRef.current = true;

      try {
        const vision =
          await FilesetResolver.forVisionTasks(
            WASM_URL
          );

        if (cancelled) {
          return;
        }

        const landmarker =
          await FaceLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  MODEL_URL,
              },

              runningMode: "VIDEO",

              numFaces: 1,

              minFaceDetectionConfidence:
                0.5,

              minFacePresenceConfidence:
                0.5,

              minTrackingConfidence:
                0.5,

              outputFaceBlendshapes:
                false,

              outputFacialTransformationMatrixes:
                false,
            }
          );

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current =
          landmarker;

        console.log(
          "[AREngine] MediaPipe prêt"
        );
      } catch (error) {
        console.error(
          "[AREngine] Impossible d'initialiser MediaPipe:",
          error
        );
      } finally {
        initializingRef.current =
          false;
      }
    }

    initialize();

    return () => {
      cancelled = true;

      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }

      previousLandmarksRef.current =
        null;
    };
  }, []);

  /**
   * Détection du visage.
   *
   * On ne fait pas nécessairement une détection
   * à chaque frame afin de préserver les performances.
   */
  const detectFace = useCallback(
    (
      video: HTMLVideoElement,
      now: number
    ): NormalizedLandmark[] | null => {
      const landmarker =
        landmarkerRef.current;

      if (!landmarker) {
        return null;
      }

      /**
       * Détection environ toutes les 33 ms.
       * Le lissage temporel maintient les landmarks
       * stables entre deux détections.
       */
      if (
        now -
          lastDetectionTimeRef.current <
        33
      ) {
        return previousLandmarksRef.current;
      }

      lastDetectionTimeRef.current =
        now;

      try {
        const result =
          landmarker.detectForVideo(
            video,
            now
          );

        if (
          !result.faceLandmarks ||
          result.faceLandmarks.length === 0
        ) {
          previousLandmarksRef.current =
            null;

          return null;
        }

        const current =
          result.faceLandmarks[0];

        const smoothed =
          smoothLandmarks(
            current,
            previousLandmarksRef.current,
            0.72
          );

        previousLandmarksRef.current =
          smoothed;

        return smoothed;
      } catch {
        return previousLandmarksRef.current;
      }
    },
    []
  );

  /**
   * Dessin d'une frame.
   */
  const renderFrame =
    useCallback(() => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (!video || !canvas) {
        animationRef.current =
          requestAnimationFrame(
            renderFrame
          );

        return;
      }

      /**
       * La vidéo doit être suffisamment chargée.
       */
      if (
        video.readyState < 2 ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0
      ) {
        animationRef.current =
          requestAnimationFrame(
            renderFrame
          );

        return;
      }

      /**
       * Le canvas garde exactement les dimensions
       * de la vidéo.
       */
      if (
        lastWidthRef.current !==
          video.videoWidth ||
        lastHeightRef.current !==
          video.videoHeight
      ) {
        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;

        lastWidthRef.current =
          video.videoWidth;

        lastHeightRef.current =
          video.videoHeight;
      }

      const ctx =
        canvas.getContext(
          "2d",
          {
            alpha: true,
            willReadFrequently: true,
          }
        );

      if (!ctx) {
        animationRef.current =
          requestAnimationFrame(
            renderFrame
          );

        return;
      }

      const width =
        canvas.width;

      const height =
        canvas.height;

      /**
       * Toujours dessiner la vidéo originale
       * avant d'appliquer la beauté.
       */
      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      /**
       * Pas d'effet beauté :
       * on garde simplement la vidéo.
       */
      if (
        !activeEffect ||
        !activeEffect.beautyConfig ||
        Object.keys(
          activeEffect.beautyConfig
        ).length === 0
      ) {
        animationRef.current =
          requestAnimationFrame(
            renderFrame
          );

        return;
      }

      /**
       * Détecter le visage.
       */
      const now =
        performance.now();

      const landmarks =
        detectFace(
          video,
          now
        );

      /**
       * Aucun visage détecté :
       * la vidéo originale reste visible.
       */
      if (
        !landmarks ||
        landmarks.length === 0
      ) {
        animationRef.current =
          requestAnimationFrame(
            renderFrame
          );

        return;
      }

      /**
       * Appliquer uniquement la configuration
       * de l'effet sélectionné.
       */
      applyBeautyEffects(
        ctx,
        landmarks,
        width,
        height,
        activeEffect.beautyConfig
      );

      frameCounterRef.current++;

      animationRef.current =
        requestAnimationFrame(
          renderFrame
        );
    }, [
      videoRef,
      activeEffect,
      detectFace,
    ]);

  /**
   * Démarrage de la boucle AR.
   */
  useEffect(() => {
    animationRef.current =
      requestAnimationFrame(
        renderFrame
      );

    return () => {
      if (
        animationRef.current !== null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );

        animationRef.current = null;
      }
    };
  }, [renderFrame]);

  /**
   * Le canvas est placé au-dessus de la caméra.
   *
   * IMPORTANT :
   * Le canvas ne bloque jamais les boutons
   * grâce à pointer-events-none.
   */
  return (
    <canvas
      ref={canvasRef}
      className="
        absolute
        inset-0
        w-full
        h-full
        pointer-events-none
        z-20
      "
      style={{
        objectFit: "cover",
      }}
    />
  );
};

export default AREngine;
