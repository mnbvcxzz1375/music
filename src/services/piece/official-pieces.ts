import type { InstrumentType, MusicGenre, Piece } from '@/services/piece/types';

const createdAt = new Date('2026-01-01');

export const OFFICIAL_PIECES: Piece[] = [
  ['official-001', '小星星', '传统民歌', 1, ['piano'], ['classical'], 60, '/pieces/little-star.xml', ['入门', '儿童', '经典'], false, 10000, 5000],
  ['official-002', '欢乐颂', '贝多芬', 2, ['piano'], ['classical'], 90, '/pieces/ode-to-joy.xml', ['入门', '古典', '经典'], false, 8000, 4000],
  ['official-003', '卡农', '帕赫贝尔', 3, ['piano'], ['classical'], 180, '/pieces/canon.xml', ['初级', '古典', '经典'], false, 15000, 8000],
  ['official-004', '月光奏鸣曲', '贝多芬', 5, ['piano'], ['classical'], 300, '/pieces/moonlight-sonata.xml', ['中级', '古典', '经典'], true, 12000, 6000],
  ['official-005', '致爱丽丝', '贝多芬', 3, ['piano'], ['classical'], 180, '/pieces/fur-elise.xml', ['初级', '古典', '经典'], false, 20000, 10000],
  ['official-006', '土耳其进行曲', '莫扎特', 4, ['piano'], ['classical'], 200, '/pieces/turkish-march.xml', ['初级', '古典', '经典'], false, 9000, 4500],
  ['official-007', '梦中的婚礼', '理查德·克莱德曼', 4, ['piano'], ['pop'], 240, '/pieces/mariage-d-amour.xml', ['初级', '流行', '浪漫'], true, 11000, 5500],
  ['official-008', '天空之城', '久石让', 3, ['piano'], ['pop'], 180, '/pieces/castle-in-the-sky.xml', ['初级', '流行', '动漫'], false, 18000, 9000],
  ['official-009', '小提琴协奏曲', '巴赫', 7, ['violin'], ['classical'], 600, '/pieces/bach-violin-concerto.xml', ['高级', '古典', '协奏曲'], true, 3000, 1500],
  ['official-010', '吉他入门练习曲', '传统', 1, ['guitar'], ['folk'], 60, '/pieces/guitar-basics.xml', ['入门', '民谣', '基础'], false, 5000, 2500],
  ['official-011', '爱的罗曼史', '传统', 3, ['guitar'], ['folk'], 180, '/pieces/romance-de-amor.xml', ['初级', '民谣', '浪漫'], false, 7000, 3500],
  ['official-012', 'Canon in D (吉他版)', '帕赫贝尔', 5, ['guitar'], ['classical'], 240, '/pieces/canon-guitar.xml', ['中级', '古典', '经典'], true, 4000, 2000],
  ['official-013', 'River Flows in You', '李闰珉', 4, ['piano'], ['pop'], 200, '/pieces/river-flows-in-you.xml', ['初级', '流行', '浪漫'], true, 25000, 12000],
  ['official-014', 'Kiss the Rain', '李闰珉', 4, ['piano'], ['pop'], 220, '/pieces/kiss-the-rain.xml', ['初级', '流行', '浪漫'], true, 22000, 11000],
  ['official-015', '巴赫大提琴独奏曲', '巴赫', 6, ['cello'], ['classical'], 480, '/pieces/bach-cello-solo.xml', ['中级', '古典', '独奏'], true, 2000, 1000],
].map(([id, title, composer, difficulty, instrumentTypes, genres, durationSeconds, musicXmlUrl, tags, isPremium, playCount, favoriteCount]) => ({
  id: id as string,
  title: title as string,
  composer: composer as string,
  difficulty: difficulty as number,
  instrumentTypes: instrumentTypes as InstrumentType[],
  genres: genres as MusicGenre[],
  durationSeconds: durationSeconds as number,
  musicXmlUrl: musicXmlUrl as string,
  tags: tags as string[],
  isOfficial: true,
  isPremium: isPremium as boolean,
  playCount: playCount as number,
  favoriteCount: favoriteCount as number,
  createdAt,
  updatedAt: createdAt,
}));

export const DIFFICULTY_LEVELS = [
  { min: 1, max: 2, label: '入门', description: '适合零基础学习者' },
  { min: 3, max: 4, label: '初级', description: '适合有一定基础的学习者' },
  { min: 5, max: 6, label: '中级', description: '适合进阶学习者' },
  { min: 7, max: 8, label: '高级', description: '适合熟练演奏者' },
  { min: 9, max: 10, label: '专业', description: '适合专业演奏者' },
];

export const GENRE_CATEGORIES = [
  { id: 'classical', label: '古典', description: '古典音乐作品' },
  { id: 'pop', label: '流行', description: '流行音乐作品' },
  { id: 'jazz', label: '爵士', description: '爵士音乐作品' },
  { id: 'folk', label: '民谣', description: '民谣音乐作品' },
  { id: 'rock', label: '摇滚', description: '摇滚音乐作品' },
];

export const INSTRUMENT_CATEGORIES = [
  { id: 'piano', label: '钢琴', piecesCount: 10 },
  { id: 'guitar', label: '吉他', piecesCount: 3 },
  { id: 'violin', label: '小提琴', piecesCount: 1 },
  { id: 'cello', label: '大提琴', piecesCount: 1 },
];

export function getOfficialPiecesByDifficulty(min: number, max: number): Piece[] {
  return OFFICIAL_PIECES.filter((piece) => piece.difficulty >= min && piece.difficulty <= max);
}

export function getOfficialPiecesByGenre(genre: MusicGenre): Piece[] {
  return OFFICIAL_PIECES.filter((piece) => piece.genres.includes(genre));
}

export function getOfficialPiecesByInstrument(instrument: InstrumentType): Piece[] {
  return OFFICIAL_PIECES.filter((piece) => piece.instrumentTypes.includes(instrument));
}

export function getPremiumPieces(): Piece[] {
  return OFFICIAL_PIECES.filter((piece) => piece.isPremium);
}

export function getFreePieces(): Piece[] {
  return OFFICIAL_PIECES.filter((piece) => !piece.isPremium);
}

export function searchOfficialPieces(query: string): Piece[] {
  const lowerQuery = query.toLowerCase();
  return OFFICIAL_PIECES.filter((piece) =>
    piece.title.toLowerCase().includes(lowerQuery) ||
    (piece.composer && piece.composer.toLowerCase().includes(lowerQuery)) ||
    piece.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
