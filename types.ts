export interface WishResponse {
  message: string;
  magicalFactor: number; // 0-100
}

export enum GameState {
  INTRO = 'INTRO', // Corresponds to CHAOS
  FORMING = 'FORMING', // Transition
  INTERACTIVE = 'INTERACTIVE', // Corresponds to FORMED
  WISH_PENDING = 'WISH_PENDING',
  WISH_GRANTED = 'WISH_GRANTED'
}

export interface OrnamentProps {
  position: [number, number, number];
  color: string;
  scale?: number;
}
