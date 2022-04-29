import { PatternRecognitionService } from './pattern-recognition-service.js';

describe('Pattern recognition tests', () => {
    test('Finding requests repetitions', () => {
        const prs = new PatternRecognitionService([{request: 'aaa'}, {request: 'bbb'}, {request: 'ccc'}, {request: 'ddd'}]);
        const result = prs.requestsRepetitionSearch()

        // assert
        expect(result).toBe(4);
    });
})
