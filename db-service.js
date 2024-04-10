import { MongoClient } from 'mongodb';
import minimist from 'minimist';

export class DbService {
    static dbService = null;
    client = null;
    db = null;
    watchedFilesCollection = null;
    logEntriesCollection = null;
    ipsInfoCollection = null;

    static async getInstance() {
        if(!DbService.dbService) {
            DbService.dbService = new DbService();
            await DbService.dbService._initialize();
        }
        return DbService.dbService;
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
        this._constructPeriod(match, from, to);
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
        this._constructPeriod(where, from, to);
        return await this.logEntriesCollection.count(where);
    }

    async getRequests(ip, from = null, to = null) {
        const where = { ip: ip };
        this._constructPeriod(where, from, to);
        return this.logEntriesCollection.find(where).sort({ time: 1 }).toArray();
    }

    async insertIpInfo(data) {
        return await this.ipsInfoCollection.insertOne(data);
    }
    async updateIpInfo(id, newObj) {
        return await this.ipsInfoCollection.updateOne({_id: id}, {$set: newObj});
    }
    async getIpInfo(ip) {
        return this.ipsInfoCollection.findOne({ ip: ip });
    }

    async _initialize() {
        try {
            const argv = minimist(process.argv.slice(2));
            const hostname = argv['mongodb-hostname'] ? argv['mongodb-hostname'] : 'localhost';
            const port = argv['mongodb-port'] ? argv['mongodb-port'] : '27017';
            this.client = new MongoClient(`mongodb://${hostname}:${port}`);
            // Connect to the MongoDB cluster
            await this.client.connect();
            console.info('MongoDB server connected.');
            this.db = this.client.db('accessLogAnalyzer');
            if(await this._doesCollectionExistInDb('watchedFiles')) {
                this.watchedFilesCollection = await this.db.collection('watchedFiles');
            } else {
                this.watchedFilesCollection = await this.db.createCollection('watchedFiles');
            }
            if(await this._doesCollectionExistInDb('logEntries')) {
                this.logEntriesCollection = await this.db.collection('logEntries');
            } else {
                this.logEntriesCollection = await this.db.createCollection('logEntries');
                await this.logEntriesCollection.createIndex({ ip: 1 });
                await this.logEntriesCollection.createIndex({ time: -1 });
                await this.logEntriesCollection.createIndex({ time: -1, ip: 1 });
            }
            if(await this._doesCollectionExistInDb('ipsInfo')) {
                this.ipsInfoCollection = await this.db.collection('ipsInfo');
            } else {
                this.ipsInfoCollection = await this.db.createCollection('ipsInfo');
                await this.ipsInfoCollection.createIndex({ ip: 1 });
            }
        } catch (err) {
            console.error(err);
        }
    }

    async _doesCollectionExistInDb(collectionName) {
        const collections = await this.db.collections();
        return collections.some(
            (collection) => collection.collectionName === collectionName
        );
    }

    _constructPeriod(where, from = null, to = null){
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
