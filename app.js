import express from 'express';
import got from 'got';
import minimist from 'minimist';
import geolite2 from 'geolite2';
import maxmind from 'maxmind';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { FileWatcherService } from './file-watcher-service.js';
import { BlockIpManagementService } from './block-ip-management-service.js';
import { DbService } from './db-service.js';
import { PatternRecognitionService } from './pattern-recognition-service.js';

const app = express();

async function _main() {
  app.set('views', './views');
  app.set('view engine', 'ejs');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  app.use('/bootstrap-css', express.static(`${__dirname}/node_modules/bootstrap/dist/css`));
  app.use('/bootstrap-js', express.static(`${__dirname}/node_modules/bootstrap/dist/js`));
  app.use('/chart-js', express.static(`${__dirname}/node_modules/chart.js/dist/`));
  app.use('/css', express.static(`${__dirname}/public/css`));
  app.use('/js', express.static(`${__dirname}/public/js`));

  const argv = minimist(process.argv.slice(2));

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
      const twentyForHoursAgo = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));

      const allDocs = await db.getIpsCount(twentyForHoursAgo);
      const ips = [];
      let allRequests = 0;
      let i = 1;
      for (const doc of allDocs) {
        allRequests += doc.count;
        if(i <= 20 || doc.count > 1000) {
          const ipInfo = await db.getIpInfo(doc._id);
          const ip = {
            i: i, address: doc._id, num: doc.count,
            info: ipInfo,
            allTime: await db.getRequestsCount(doc._id),
            rowColor: () => {
              if (ipInfo) {
                if (ipInfo.allowed) {
                  return 'success';
                } else if (ipInfo.blocked) {
                  return 'danger';
                } else if (ipInfo.suspicious > 0) {
                  return 'warning';
                } else if (ipInfo.checked > 0) {
                  return 'info';
                }
              }
              return 'default';
            },
            geoip: doc.geoip,
            country: await _getCountry(doc._id)
          };
          if(req.query.html !== 'no' && _shouldExamineIp(ipInfo, doc.count)) {
            const prs = new PatternRecognitionService(await db.getRequests(doc._id, twentyForHoursAgo ));
            ip.requestsRepetiotions = prs.requestsRepetitionSearch();
            ip.numUnique = prs.uniqueRequests.length;
            ip.bytes = prs.bytes;
            ip.numStatusCodes = prs.statusCodes.length;
            ip.numUserAgents = prs.userAgents.length;
          }
          ips.push(ip);
        }
        i++;
      }
      res.render(req.query.html === 'no' ? 'index-no-html' : 'index', {
        ips: ips, unique: allDocs.length,
        all: allRequests,
      });
    });
    app.get('/ip/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      if(!ipInfo){
        ipInfo = {
          ip: req.params.ip,
          checked: 1,
          blocked: false,
          allowed: false,
          suspicious: 0
        }
        await db.insertIpInfo(ipInfo);
      } else if(!req.query.no_checked) {
        ipInfo.checked++;
        await db.updateIpInfo(ipInfo._id, {checked: ipInfo.checked});
      }
      const geoData = await got(`http://api.ipstack.com/${req.params.ip}?access_key=240dbf2c72b8038d08465723ac3ff9aa&location=1`).json();
      const twentyForHoursAgo = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      const prs = new PatternRecognitionService(await db.getRequests(req.params.ip, twentyForHoursAgo ));
      res.render('ip', {
        ip: req.params.ip,
        geoData,
        uniqueRequests: prs.uniqueRequests,
        bytes: prs.bytes,
        requests: prs.docs,
        statusCodes: prs.statusCodes,
        userAgents: prs.userAgents,
        getRequestsPerDate: prs.getRequestsPerDate(),
        ipInfo: ipInfo,
        allTimeRequests: await db.getRequestsCount(req.params.ip)
      });
    });
    app.get('/suspicious/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      await db.updateIpInfo(ipInfo._id, {suspicious: ++ipInfo.suspicious});
      res.redirect(`/ip/${req.params.ip}?no_checked=1`)
    });
    app.get('/block/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      await db.updateIpInfo(ipInfo._id, {blocked: true, allowed: false});
      blockIpManagement.block(req.params.ip);
      res.redirect(`/ip/${req.params.ip}?no_checked=1`)
    });
    app.get('/unblock/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      await db.updateIpInfo(ipInfo._id, {blocked: false});
      blockIpManagement.unblock(req.params.ip);
      res.redirect(`/ip/${req.params.ip}?no_checked=1`)
    });
    app.get('/allow/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      await db.updateIpInfo(ipInfo._id, {allowed: true, blocked: false});
      blockIpManagement.unblock(req.params.ip);
      res.redirect(`/ip/${req.params.ip}?no_checked=1`)
    });
    app.get('/disallow/:ip', async (req, res) => {
      let ipInfo = await db.getIpInfo(req.params.ip);
      await db.updateIpInfo(ipInfo._id, {allowed: false});
      res.redirect(`/ip/${req.params.ip}?no_checked=1`)
    });

    const port = argv['localhost-port'] ? argv['localhost-port'] : '3000';
    app.listen(port, () => {
      console.info(`Localhost server started on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}
function _shouldExamineIp(ipInfo, numRequests) {
  if(!ipInfo) {
    return numRequests > 5000;
  }
  if(ipInfo.allowed || ipInfo.blocked) {
    return false;
  }
  if(ipInfo.suspicious > 0) {
    return true;
  }
  return numRequests > 5000;
}
async function _getCountry(ip) {
  const lookup = await maxmind.open(geolite2.paths.country);
  const country = lookup.get(ip);
  console.log(country)
  return country;
}
_main();
