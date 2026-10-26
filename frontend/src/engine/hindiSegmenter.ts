/**
 * Hindi Devanagari & Multilingual Text Segmentation and Masking Module
 * Uses Intl.Segmenter with grapheme cluster granularity to avoid breaking
 * viramas, matras, and conjuncts (क्ष, त्र, ज्ञ, श्र, etc.).
 */

// Initialize grapheme segmenter
const hindiSegmenter = (typeof Intl !== 'undefined' && (Intl as any).Segmenter)
  ? new (Intl as any).Segmenter('hi', { granularity: 'grapheme' })
  : null;

/**
 * Counts the true grapheme clusters in a string (crucial for Devanagari word length covariate).
 */
export function getGraphemeCount(text: string): number {
  if (!text) return 0;
  if (hindiSegmenter) {
    let count = 0;
    for (const _ of hindiSegmenter.segment(text)) {
      count++;
    }
    return count;
  }
  // Fallback for environments lacking Intl.Segmenter
  return Array.from(text).length;
}

/**
 * Splits a text into grapheme clusters.
 */
export function getGraphemeClusters(text: string): string[] {
  if (!text) return [];
  if (hindiSegmenter) {
    const clusters: string[] = [];
    for (const segment of hindiSegmenter.segment(text)) {
      clusters.push(segment.segment);
    }
    return clusters;
  }
  return Array.from(text);
}

/**
 * Creates a masked placeholder matching the visual grapheme width of the word/region.
 * By default in moving-window SPR, letters are replaced by underscores or dashes.
 * For Hindi Devanagari, using continuous em-dash or proportional dashes creates
 * a visually stable mask that doesn't collapse or expand when unmasked.
 */
export function createWordMask(word: string): string {
  if (!word) return '';
  const clusters = getGraphemeClusters(word);
  return '—'.repeat(Math.max(1, clusters.length));
}

/**
 * Normalizes Unicode text to NFC to eliminate combining accent surprises.
 */
export function normalizeNfc(text: string): string {
  return text.normalize('NFC');
}
