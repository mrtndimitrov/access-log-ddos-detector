const { MongoClient } = require('mongodb');

class DbService {
    static dbService = null;
    client = null;
    db = null;
    watchedFilesCollection = null;
    logEntriesCollection = null;

    async initialize() {
        try {
            this.client = new MongoClient('mongodb://localhost:27017');
            // Connect to the MongoDB cluster
            await this.client.connect();
            console.info('MongoDB server connected.');
            this.db = this.client.db('accessLogAnalyzer');
            this.watchedFilesCollection = await this.db.collection('watchedFiles');
            this.logEntriesCollection = await this.db.collection('logEntries');
        } catch (err) {
            console.error(err);
        }
    }

    async getFileData(filename) {
        return await this.watchedFilesCollection.findOne({name: filename});
    }
    async insertFileData(data) {
        return await this.watchedFilesCollection.insertOne(data);
    }
    async updateFileRead(id, newVal) {
        return await this.watchedFilesCollection.updateOne({_id: id}, {$set: {read: newVal}});
    }
    async insertLogEntry(doc) {
        return await this.logEntriesCollection.insertOne(doc);
    }

    static async getInstance() {
        if(!DbService.dbService) {
            DbService.dbService = new DbService();
            await DbService.dbService.initialize();
        }
        return DbService.dbService;
    }
}
exports.DbService = DbService;
