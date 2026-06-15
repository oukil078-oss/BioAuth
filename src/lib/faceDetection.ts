import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true;
  });

  return modelsLoading;
}

export async function detectFace(
  video: HTMLVideoElement
): Promise<{ descriptor: Float32Array; detection: faceapi.FaceDetection } | null> {
  const result = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;
  return { descriptor: result.descriptor, detection: result.detection };
}

export async function detectFaceCount(video: HTMLVideoElement): Promise<number> {
  const results = await faceapi.detectAllFaces(video);
  return results.length;
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export interface DetectedFaceResult {
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
}

export async function detectAllFacesWithDescriptors(
  video: HTMLVideoElement
): Promise<DetectedFaceResult[]> {
  const results = await faceapi
    .detectAllFaces(video)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => ({
    descriptor: r.descriptor,
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    },
  }));
}

export function euclideanDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export const STRICT_MATCH_THRESHOLD = 0.55;
