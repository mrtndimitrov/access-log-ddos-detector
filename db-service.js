const { MongoClient } = require('mongodb');

class DbService {
    static dbService = null;
    client = null;
    db = null;
    watchedFilesCollection = null;
    logEntriesCollection = null;

    async initialize() {
        try {
            const argv = require('minimist')(process.argv.slice(2));
            const hostname = argv['mongodb-hostname'] ? argv['mongodb-hostname'] : 'localhost';
            const port = argv['mongodb-port'] ? argv['mongodb-port'] : '27017';
            this.client = new MongoClient(`mongodb://${hostname}:${port}`);
            // Connect to the MongoDB cluster
            await this.client.connect();
            console.info('MongoDB server connected.');
            this.db = this.client.db('accessLogAnalyzer');
            if(await this.doesCollectionExistInDb('watchedFiles')) {
                this.watchedFilesCollection = await this.db.collection('watchedFiles');
            } else {
                this.watchedFilesCollection = await this.db.createCollection('watchedFiles');
            }
            if(await this.doesCollectionExistInDb('logEntries')) {
                this.logEntriesCollection = await this.db.collection('logEntries');
            } else {
                this.logEntriesCollection = await this.db.createCollection('logEntries');
                await this.logEntriesCollection.createIndex({ ip: 1 });
                await this.logEntriesCollection.createIndex({ time: -1 });
                await this.logEntriesCollection.createIndex({ time: -1, ip: 1 });
            }
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
    async doesCollectionExistInDb(collectionName) {
        const collections = await this.db.collections();
        return collections.some(
            (collection) => collection.collectionName === collectionName
        );
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
