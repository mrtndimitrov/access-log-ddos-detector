const { PatternRecognitionService } = require('./pattern-recognition-service');

describe('Pattern recognition tests', () => {
    test('Finding requests repetitions', () => {
        const prs = new PatternRecognitionService([{request: 'aaa'}, {request: 'bbb'}, {request: 'ccc'}, {request: 'ddd'}]);
        const result = prs.requestsRepetitionSearch()

        // assert
        expect(result).toBe(4);
    });
})
