export type PracticeOrder = 'sequential' | 'random' | 'reverse';
export type PracticeType = 'speech' | 'tap';
export type TapGameMode = 'answer' | 'expression' | 'mixed';
export type TapQuestionKind = Exclude<TapGameMode, 'mixed'>;

export interface TapQuestion {
  expression: string;
  prompt: string;
  correctChoice: string;
  choices: string[];
  kind: TapQuestionKind;
}

type RandomSource = () => number;

const multipliers = Array.from({ length: 10 }, (_, index) => index + 1);

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function orderedMultipliers(order: PracticeOrder, random: RandomSource): number[] {
  if (order === 'reverse') return [...multipliers].reverse();
  if (order === 'random') return shuffle(multipliers, random);
  return [...multipliers];
}

function choicesForQuestion(
  table: number,
  multiplier: number,
  kind: TapQuestionKind,
  random: RandomSource,
): Pick<TapQuestion, 'prompt' | 'correctChoice' | 'choices' | 'kind'> {
  const correctAnswer = table * multiplier;
  const incorrectMultipliers = shuffle(
    multipliers.filter((candidate) => candidate !== multiplier),
    random,
  ).slice(0, 3);

  if (kind === 'expression') {
    const correctChoice = `${table} x ${multiplier}`;
    const choices = shuffle([
      correctChoice,
      ...incorrectMultipliers.map((candidate) => `${table} x ${candidate}`),
    ], random);
    return { kind, prompt: `${correctAnswer} = ?`, correctChoice, choices };
  }

  const correctChoice = String(correctAnswer);
  const choices = shuffle([
    correctChoice,
    ...incorrectMultipliers.map((candidate) => String(table * candidate)),
  ], random);
  return { kind, prompt: `${table} x ${multiplier} = ?`, correctChoice, choices };
}

/** 선택한 단과 순서 규칙에 맞는 10개 고유 말하기 문항을 생성합니다. */
export function createQuestionOrder(
  table: number,
  order: PracticeOrder,
  random: RandomSource = Math.random,
): string[] {
  return orderedMultipliers(order, random).map((multiplier) => `${table} x ${multiplier}`);
}

/** 누르는 구구단의 보기·출제 형식을 UI와 독립적으로 생성합니다. */
export function buildTapQuestions(
  table: number,
  order: PracticeOrder,
  gameMode: TapGameMode,
  random: RandomSource = Math.random,
): TapQuestion[] {
  const questionMultipliers = orderedMultipliers(order, random);
  const answerIndexes = gameMode === 'mixed'
    ? new Set(shuffle(questionMultipliers.map((_, index) => index), random).slice(0, 5))
    : new Set<number>();

  return questionMultipliers.map((multiplier, index) => {
    const kind: TapQuestionKind = gameMode === 'mixed'
      ? (answerIndexes.has(index) ? 'answer' : 'expression')
      : gameMode;
    const question = choicesForQuestion(table, multiplier, kind, random);
    return {
      expression: `${table} x ${multiplier}`,
      ...question,
    };
  });
}

export function calculateScore(totalCorrect: number, order: PracticeOrder): number {
  const multiplier = order === 'reverse' ? 12 : order === 'random' ? 20 : 10;
  return totalCorrect * multiplier;
}
