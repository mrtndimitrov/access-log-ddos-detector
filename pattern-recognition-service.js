class PatternRecognitionService {
    data = [];
    constructor(docs) {
        this.data = docs;
    }
    requestsRepetitionSearch() {
        return this.data.length;
    }
}
exports.PatternRecognitionService = PatternRecognitionService;
