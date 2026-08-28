import { describe, expect, it } from 'vitest';
import {
  buildTapQuestions,
  buildChallengeTapQuestions,
  calculateScore,
  calculateChallengeStars,
  createChallengeQuestions,
  createQuestionOrder,
} from './practice';

describe('createQuestionOrder', () => {
  it('creates sequential and reverse orders without duplicated multiplication questions', () => {
    expect(createQuestionOrder(3, 'sequential')).toEqual([
      '3 x 1', '3 x 2', '3 x 3', '3 x 4', '3 x 5',
      '3 x 6', '3 x 7', '3 x 8', '3 x 9', '3 x 10',
    ]);
    expect(createQuestionOrder(3, 'reverse')).toEqual([
      '3 x 10', '3 x 9', '3 x 8', '3 x 7', '3 x 6',
      '3 x 5', '3 x 4', '3 x 3', '3 x 2', '3 x 1',
    ]);
  });

  it('creates a shuffled permutation of every multiplier exactly once', () => {
    const questions = createQuestionOrder(7, 'random', () => 0);

    expect(questions).toHaveLength(10);
    expect(new Set(questions).size).toBe(10);
    expect([...questions].sort()).toEqual([
      '7 x 1', '7 x 10', '7 x 2', '7 x 3', '7 x 4',
      '7 x 5', '7 x 6', '7 x 7', '7 x 8', '7 x 9',
    ]);
  });
});

describe('buildTapQuestions', () => {
  it('builds answer-choice questions with one correct numeric choice and three unique wrong choices', () => {
    const [question] = buildTapQuestions(4, 'sequential', 'answer', () => 0);

    expect(question.kind).toBe('answer');
    expect(question.prompt).toBe('4 x 1 = ?');
    expect(question.correctChoice).toBe('4');
    expect(question.choices).toHaveLength(4);
    expect(new Set(question.choices).size).toBe(4);
    expect(question.choices).toContain('4');
  });

  it('builds expression-choice questions where only the correct expression makes the displayed answer', () => {
    const [question] = buildTapQuestions(5, 'sequential', 'expression', () => 0);

    expect(question.kind).toBe('expression');
    expect(question.prompt).toBe('5 = ?');
    expect(question.correctChoice).toBe('5 x 1');
    expect(question.choices).toHaveLength(4);
    expect(new Set(question.choices).size).toBe(4);
    expect(question.choices.filter((choice) => choice === '5 x 1')).toHaveLength(1);
  });

  it('builds mixed mode with five answer questions, five expression questions, and no repeated source expression', () => {
    const questions = buildTapQuestions(6, 'sequential', 'mixed', () => 0);

    expect(questions).toHaveLength(10);
    expect(questions.filter((question) => question.kind === 'answer')).toHaveLength(5);
    expect(questions.filter((question) => question.kind === 'expression')).toHaveLength(5);
    expect(new Set(questions.map((question) => question.expression)).size).toBe(10);
    expect(questions.map((question) => question.expression)).toEqual([
      '6 x 1', '6 x 2', '6 x 3', '6 x 4', '6 x 5',
      '6 x 6', '6 x 7', '6 x 8', '6 x 9', '6 x 10',
    ]);
  });
});

describe('calculateScore', () => {
  it('uses the existing score multiplier for each question order', () => {
    expect(calculateScore(6, 'sequential')).toBe(60);
    expect(calculateScore(6, 'reverse')).toBe(72);
    expect(calculateScore(6, 'random')).toBe(120);
    expect(calculateScore(10, 'random')).toBe(200);
  });
});

describe('createChallengeQuestions', () => {
  it('creates the requested number of unique expressions from the 1 to 9 tables', () => {
    const questions = createChallengeQuestions(20, () => 0);

    expect(questions).toHaveLength(20);
    expect(new Set(questions.map((question) => question.expression)).size).toBe(20);
    expect(questions.every((question) => question.left >= 1 && question.left <= 9)).toBe(true);
    expect(questions.every((question) => question.right >= 1 && question.right <= 9)).toBe(true);
  });

  it('only accepts the three configured challenge question counts', () => {
    expect(() => createChallengeQuestions(19 as 20)).toThrow();
    expect(() => createChallengeQuestions(31 as 30)).toThrow();
  });
});

describe('buildChallengeTapQuestions', () => {
  it('builds answer choices for answer-tap mode and expression choices for expression-tap mode', () => {
    const source = [
      { left: 3, right: 4, expression: '3 x 4', answer: 12 },
      { left: 2, right: 6, expression: '2 x 6', answer: 12 },
    ];

    const answerQuestions = buildChallengeTapQuestions(source, 'answer-tap', () => 0);
    const expressionQuestions = buildChallengeTapQuestions(source, 'expression-tap', () => 0);

    expect(answerQuestions[0]).toMatchObject({ prompt: '3 x 4 = ?', correctChoice: '12', kind: 'answer' });
    expect(expressionQuestions[0]).toMatchObject({ prompt: '12 = ?', correctChoice: '3 x 4', kind: 'expression' });
    expect(answerQuestions[0].choices).toContain('12');
    expect(expressionQuestions[0].choices).toContain('3 x 4');
  });
});

describe('calculateChallengeStars', () => {
  it.each([
    [20, 20, 5],
    [18, 20, 4],
    [16, 20, 3],
    [14, 20, 2],
    [13, 20, 1],
  ] as const)('assigns %i correct out of %i questions to %i stars', (correct, total, stars) => {
    expect(calculateChallengeStars(correct, total)).toBe(stars);
  });
});
