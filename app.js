const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const app = express();
const port = 3000;

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    // const result = await client.db('accessLogAnalyzer').collection('accessLogs').insertOne({ip: '2.3.4.5'});
    fs.watch(buttonPressesLogFile, (event, filename) => {
      if (filename) {
        if (fsWait) return;
        fsWait = setTimeout(() => {
          fsWait = false;
        }, 100);
        const md5Current = md5(fs.readFileSync(buttonPressesLogFile));
        if (md5Current === md5Previous) {
          return;
        }
        md5Previous = md5Current;
        console.log(`${filename} file Changed`);
      }
    });
    console.log(`New log entry created with the following id: ${result.insertedId}`);

    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    app.listen(port, () => {
      console.log(`Localhost server started on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
}
main();
