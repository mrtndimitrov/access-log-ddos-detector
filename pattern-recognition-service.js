class PatternRecognitionService {
    data = [];
    constructor(docs) {
        this.data = docs;
    }
    requestPatternSearch() {
        return this.data.length;
    }
}
exports.PatternRecognitionService = PatternRecognitionService;
