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
