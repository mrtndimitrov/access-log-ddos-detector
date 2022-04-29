import { MongoClient } from 'mongodb';
import minimist from 'minimist';

export class DbService {
    static dbService = null;
    client = null;
    db = null;
    watchedFilesCollection = null;
    logEntriesCollection = null;

    async initialize() {
        try {
            const argv = minimist(process.argv.slice(2));
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

    async doesCollectionExistInDb(collectionName) {
        const collections = await this.db.collections();
        return collections.some(
            (collection) => collection.collectionName === collectionName
        );
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

    async getIpsCount(from = null, to = null) {
        const match = {};
        this.constructPeriod(match, from, to);
        const pipeline = [
            { $match: match },
            { $group: { _id: '$ip', count: { $sum: 1 } } },
            { $sort:  { count: -1 } }
        ];
        const aggCursor = this.logEntriesCollection.aggregate(pipeline);
        return await aggCursor.toArray();
    }

    async getRequestsCount(ip, from = null, to = null) {
        const where = { ip: ip };
        this.constructPeriod(where, from, to);
        return await this.logEntriesCollection.count(where);
    }

    async getRequests(ip, from = null, to = null) {
        const where = { ip: ip };
        this.constructPeriod(where, from, to);
        return this.logEntriesCollection.find(where).toArray();
    }

    static async getInstance() {
        if(!DbService.dbService) {
            DbService.dbService = new DbService();
            await DbService.dbService.initialize();
        }
        return DbService.dbService;
    }

    constructPeriod(where, from = null, to = null){
        if (from && to) {
            where.time = { $gt: from, $lt: to };
        } else {
            if (from) {
                where.time = {$gt: from};
            } else if (to) {
                where.time = {$lt: to};
            }
        }
    }
}
