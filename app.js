const express = require('express');
const { FileWatcherService } = require('./file-watcher-service');
const { BlockIpManagementService } = require('./block-ip-management-service');
const {DbService} = require("./db-service");

const app = express();
const port = 3000;

async function main() {
  app.set('views', './views');
  app.set('view engine', 'ejs');

  const argv = require('minimist')(process.argv.slice(2));

  try {
    // initialize database
    const db = await DbService.getInstance();

    // initialize the block ip management service
    const blockIpManagement = new BlockIpManagementService(argv);

    // Check which files we need to process and watch for changes
    FileWatcherService.parseFiles(argv, (files) => {
      for(const file of files) {
        new FileWatcherService(file);
      }
    });

    // start the http server
    app.get('/', async (req, res) => {
      // let's get a count of all IPs in the last 24 hours
      const pipeline = [
        { $match: { time: { $gt: new Date(new Date().getTime() - (24 * 60 * 60 * 1000)) } } },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort:  { count: -1 } }
      ];
      const aggCursor = db.logEntriesCollection.aggregate(pipeline);
      const allDocs = await aggCursor.toArray();
      const ips = [];
      let allRequests = 0;
      let i = 1;
      for (const doc of allDocs) {
        allRequests += doc.count;
        if(i <= 20 || doc.count > 1000) {
          ips.push({i: i, address: doc._id, num: doc.count});
        }
        i++;
      }
      res.render(req.query.html === 'no' ? 'index-no-html' : 'index', { ips: ips, unique: allDocs.length, all: allRequests });
    });
    app.listen(port, () => {
      console.info(`Localhost server started on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}
main();
