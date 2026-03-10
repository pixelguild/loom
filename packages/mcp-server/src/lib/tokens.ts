import { encoding_for_model } from 'tiktoken';

type TiktokenEncoder = ReturnType<typeof encoding_for_model>;

let encoder: TiktokenEncoder | null = null;

function getEncoder(): TiktokenEncoder {
  if (!encoder) {
    encoder = encoding_for_model('gpt-4o');
  }
  return encoder;
}

export function countTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return getEncoder().encode(text).length;
}
