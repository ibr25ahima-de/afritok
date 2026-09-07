from pathlib import Path
import urllib.request
import cv2
import numpy as np

try:
    import mediapipe as mp
except ImportError as exc:
    raise SystemExit("mediapipe Python est requis: pip install mediapipe") from exc

ROOT = Path('/home/ubuntu/afritok')
IMAGE = Path('/home/ubuntu/upload/Screenshot_20260907-173416.png')
OUT = ROOT / 'artifacts' / 'face-lighting-test'
MODEL = OUT / 'face_landmarker.task'
OUT.mkdir(parents=True, exist_ok=True)
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

if not MODEL.exists():
    urllib.request.urlretrieve(MODEL_URL, MODEL)

source = cv2.imread(str(IMAGE))
if source is None:
    raise SystemExit(f'Image introuvable: {IMAGE}')

# Crop away the browser chrome and navigation bars, keeping the camera content.
h, w = source.shape[:2]
source = source[int(h * 0.115):int(h * 0.905), :]


def gamma(img, value):
    table = np.array([((i / 255.0) ** (1.0 / value)) * 255 for i in np.arange(256)]).astype('uint8')
    return cv2.LUT(img, table)


def tint(img, b, g, r):
    out = img.astype(np.float32)
    out[:, :, 0] *= b
    out[:, :, 1] *= g
    out[:, :, 2] *= r
    return np.clip(out, 0, 255).astype(np.uint8)


def side_shadow(img):
    mask = np.ones(img.shape[:2], dtype=np.float32)
    mask[:, : img.shape[1] // 2] = np.linspace(0.18, 1.0, img.shape[1] // 2)[None, :]
    return np.clip(img.astype(np.float32) * mask[:, :, None], 0, 255).astype(np.uint8)


def low_quality(img):
    small = cv2.resize(img, (max(96, img.shape[1] // 6), max(96, img.shape[0] // 6)), interpolation=cv2.INTER_AREA)
    return cv2.resize(small, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)


def colored_darkness(img):
    dark = gamma(img, 0.28)
    return tint(dark, 0.72, 0.84, 1.20)


def backlight(img):
    gradient = np.linspace(0.15, 1.0, img.shape[0], dtype=np.float32)[:, None]
    return np.clip(img.astype(np.float32) * gradient[:, :, None], 0, 255).astype(np.uint8)

cases = {
    '01_original': source,
    '02_underexposed': gamma(source, 0.48),
    '03_overexposed': gamma(source, 1.85),
    '04_high_contrast': cv2.convertScaleAbs(source, alpha=1.75, beta=-70),
    '05_low_contrast': cv2.convertScaleAbs(source, alpha=0.55, beta=65),
    '06_warm_light': tint(source, 0.90, 1.00, 1.18),
    '07_cool_light': tint(source, 1.18, 1.04, 0.88),
    '08_side_shadow': side_shadow(source),
    '09_grayscale': cv2.cvtColor(cv2.cvtColor(source, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR),
    '10_low_quality': low_quality(source),
    '11_motion_blur': cv2.GaussianBlur(source, (11, 11), 0),
    '12_extreme_dark_blue': colored_darkness(source),
    '13_strong_backlight': backlight(source),
    '14_extreme_underexposed': gamma(source, 0.22),
}

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode
options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=str(MODEL)),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.15,
    min_face_presence_confidence=0.15,
    min_tracking_confidence=0.15,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
)

results = []
with FaceLandmarker.create_from_options(options) as landmarker:
    for name, image in cases.items():
        path = OUT / f'{name}.jpg'
        cv2.imwrite(str(path), image, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)
        faces = len(result.face_landmarks)
        landmarks = len(result.face_landmarks[0]) if faces else 0
        results.append((name, faces, landmarks, 'PASS' if faces == 1 and landmarks >= 400 else 'WEAK'))

report = OUT / 'RESULTS.md'
with report.open('w', encoding='utf-8') as f:
    f.write('# Face Landmarker lighting robustness test\n\n')
    f.write(f'Source: `{IMAGE}`\n\n')
    f.write('| Scenario | Faces | Landmarks | Result |\n|---|---:|---:|---|\n')
    for row in results:
        f.write('| ' + ' | '.join(map(str, row)) + ' |\n')
    passed = sum(1 for row in results if row[3] == 'PASS')
    f.write(f'\n**Summary:** {passed}/{len(results)} scenarios detected one face with at least 400 landmarks.\n')

print(report)
for row in results:
    print('\t'.join(map(str, row)))
