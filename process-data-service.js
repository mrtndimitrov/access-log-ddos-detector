const Alpine = require('alpine');
const moment = require('moment');
const { DbService } = require('./db-service');

/**
 * JSON object return by alpine:
 * {
 * originalLine: '::1 - - [09/Oct/2021:15:40:37 +0300] "GET /dashboard/javascripts/modernizr.js HTTP/1.1" 200 51365 "http://localhost/dashboard/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36"',
 * remoteHost: '::1',
 * logname: '-',
 * remoteUser: '-',
 * time: '09/Oct/2021:15:40:37 +0300',
 * request: 'GET /dashboard/javascripts/modernizr.js HTTP/1.1',
 * status: '200',
 * sizeCLF: '51365',
 * 'RequestHeader Referer': 'http://localhost/dashboard/',
 * 'RequestHeader User-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36'
 * }
 */

class ProcessDataService {
    async parseLogEntry(data) {
        const alpine = new Alpine();
        const lines = data.split(/[\r]?\n/);
        for (const line of lines) {
            if(line) {
                const alpineJson = alpine.parseLine(line);
                const [method, request, protocol] = alpineJson.request.split(' ');
                const json = {
                    ip: alpineJson.remoteHost,
                    time: new Date(moment(alpineJson.time, 'DD/MMM/YYYY:HH:mm:ss Z')),
                    method, request, protocol,
                    status: alpineJson.status,
                    size: alpineJson.sizeCLF,
                    referer: alpineJson['RequestHeader Referer'],
                    user_agent: alpineJson['RequestHeader User-agent']
                };
                const db = await DbService.getInstance();
                await db.insertLogEntry(json);
            }
        }
    }
}
exports.ProcessDataService = ProcessDataService;
