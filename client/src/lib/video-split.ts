export type VideoRange = {
  start: number;
  end: number;
};

export type VideoSegment = VideoRange & {
  id: string;
};

const EPSILON = 0.05;

export function normalizeVideoRanges(ranges: VideoRange[]): VideoRange[] {
  return [...ranges]
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end - range.start >= EPSILON)
    .sort((a, b) => a.start - b.start)
    .reduce<VideoRange[]>((result, range) => {
      const last = result[result.length - 1];
      if (last && range.start <= last.end + EPSILON) {
        last.end = Math.max(last.end, range.end);
      } else {
        result.push({ start: range.start, end: range.end });
      }
      return result;
    }, []);
}

export function buildVideoSegments(trimStart: number, trimEnd: number, removed: VideoRange[], splitPoints: number[]): VideoSegment[] {
  const start = Math.min(trimStart, trimEnd);
  const end = Math.max(trimStart, trimEnd);
  if (end - start < EPSILON) return [];

  const removedRanges = normalizeVideoRanges(
    removed
      .map((range) => ({
        start: Math.max(start, range.start),
        end: Math.min(end, range.end),
      }))
      .filter((range) => range.end - range.start >= EPSILON),
  );

  const points = [...new Set(
    splitPoints
      .filter((point) => point > start + EPSILON && point < end - EPSILON)
      .filter((point) => !removedRanges.some((range) => point > range.start && point < range.end)),
  )].sort((a, b) => a - b);

  const boundaries = [start, ...points, end];
  const segments: VideoSegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStart = boundaries[index];
    const segmentEnd = boundaries[index + 1];
    if (segmentEnd - segmentStart < EPSILON) continue;

    let cursor = segmentStart;
    for (const removedRange of removedRanges) {
      if (removedRange.end <= cursor) continue;
      if (removedRange.start >= segmentEnd) break;

      if (removedRange.start > cursor) {
        segments.push({ id: `${cursor.toFixed(3)}-${Math.min(removedRange.start, segmentEnd).toFixed(3)}`, start: cursor, end: Math.min(removedRange.start, segmentEnd) });
      }
      cursor = Math.max(cursor, removedRange.end);
      if (cursor >= segmentEnd) break;
    }

    if (cursor < segmentEnd) {
      segments.push({ id: `${cursor.toFixed(3)}-${segmentEnd.toFixed(3)}`, start: cursor, end: segmentEnd });
    }
  }

  return segments;
}

export function splitVideoAt(splitAt: number, trimStart: number, trimEnd: number, removed: VideoRange[], splitPoints: number[]): number[] {
  const start = Math.min(trimStart, trimEnd);
  const end = Math.max(trimStart, trimEnd);
  const point = Math.max(start, Math.min(splitAt, end));
  if (point <= start + EPSILON || point >= end - EPSILON) return [...splitPoints];

  const segments = buildVideoSegments(start, end, removed, splitPoints);
  const insideSegment = segments.some((segment) => point > segment.start + EPSILON && point < segment.end - EPSILON);
  if (!insideSegment) return [...splitPoints];

  return [...new Set([...splitPoints, point])].sort((a, b) => a - b);
}

export function removeVideoSegment(segment: VideoRange, trimStart: number, trimEnd: number, removed: VideoRange[]): VideoRange[] {
  const start = Math.min(segment.start, segment.end);
  const end = Math.max(segment.start, segment.end);
  const trimMin = Math.min(trimStart, trimEnd);
  const trimMax = Math.max(trimStart, trimEnd);
  if (end - start < EPSILON || end <= trimMin || start >= trimMax) return normalizeVideoRanges(removed);

  return normalizeVideoRanges([
    ...removed,
    {
      start: Math.max(trimMin, start),
      end: Math.min(trimMax, end),
    },
  ]);
}
