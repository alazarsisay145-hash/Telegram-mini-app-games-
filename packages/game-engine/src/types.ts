export interface GameEngine<TInput, TResult> {
  validate(input: TInput): void;
  resolve(input: TInput): TResult;
  calculateReward(input: TInput, result: TResult): number;
  getResult(input: TInput): TResult;
}

export interface KenoInput {
  stake: number;
  selectedNumbers: number[];
  payoutTable: Record<number, Record<number, number>>;
}

export interface KenoResult {
  drawNumbers: number[];
  matches: number;
  multiplier: number;
  payout: number;
}
