import fs from 'fs';
import { DbService } from './db-service.js';
import { EOL } from 'os';

export class IpManagementService {
    blockIpsFile = null;
    allowIpsFile = null;
    db = null;
    blockedIps = [];
    allowedIps = [];

    constructor(argv) {
        this.blockIpsFile = argv['block-ips-file'] ? argv['block-ips-file'] : (argv['b'] ? argv['b'] : null);
        this.allowIpsFile = argv['allow-ips-file'] ? argv['allow-ips-file'] : (argv['a'] ? argv['a'] : null);
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            this._processBlockFile();
        }
        if (this.allowIpsFile && fs.existsSync(this.allowIpsFile)) {
            this._processAllowFile();
        }
    }
    async _processBlockFile(){
        this.db = await DbService.getInstance();
        const allFileContents = fs.readFileSync(this.blockIpsFile, 'utf-8');
        this.blockedIps = allFileContents.split(/\r?\n/);
        console.log(`${this.blockedIps.length} found in BLOCK file. Adding them to our DB if not already there.`);
        for (const ip of this.blockedIps) {
            let ipInfo = await this.db.getIpInfo(ip);
            if(!ipInfo){
                ipInfo = {
                    ip: ip,
                    checked: 0,
                    blocked: true,
                    allowed: false,
                    suspicious: 0
                }
                await this.db.insertIpInfo(ipInfo);
            } else {
                await this.db.updateIpInfo(ipInfo._id, {blocked: true, allowed: false});
            }
        }
    }

    async _processAllowFile(){
        this.db = await DbService.getInstance();
        const allFileContents = fs.readFileSync(this.allowIpsFile, 'utf-8');
        this.allowedIps = allFileContents.split(/\r?\n/);
        console.log(`${this.allowedIps.length} found in ALLOW file. Adding them to our DB if not already there.`);
        for (const ip of this.allowedIps) {
            let ipInfo = await this.db.getIpInfo(ip);
            if(!ipInfo){
                ipInfo = {
                    ip: ip,
                    checked: 0,
                    blocked: false,
                    allowed: true,
                    suspicious: 0
                }
                await this.db.insertIpInfo(ipInfo);
            } else {
                await this.db.updateIpInfo(ipInfo._id, {blocked: false, allowed: true});
            }
        }
    }

    async block(ip) {
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            if (this.blockedIps.indexOf(ip) === -1) {
                // let's reload the file first in case someone has modified it manually
                await this._processBlockFile();
                console.log(`Adding IP ${ip} to block file.`);
                this.blockedIps.push(ip);
                fs.writeFileSync(this.blockIpsFile, this.blockedIps.join(EOL));
            }
        }
    }
    async unblock(ip) {
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            const index = this.blockedIps.indexOf(ip);
            if (index > -1) {
                // let's reload the file first in case someone has modified it manually
                await this._processBlockFile();
                console.log(`Removing IP ${ip} from block file.`);
                this.blockedIps.splice(index, 1);
                fs.writeFileSync(this.blockIpsFile, this.blockedIps.join(EOL));
            }
        }
    }

    async allow(ip) {
        if (this.allowIpsFile && fs.existsSync(this.allowIpsFile)) {
            if (this.allowedIps.indexOf(ip) === -1) {
                // let's reload the file first in case someone has modified it manually
                await this._processAllowFile();
                console.log(`Adding IP ${ip} to allow file.`);
                this.allowedIps.push(ip);
                fs.writeFileSync(this.allowIpsFile, this.allowedIps.join(EOL));
            }
        }
    }
    async unallow(ip) {
        if (this.allowIpsFile && fs.existsSync(this.allowIpsFile)) {
            const index = this.allowedIps.indexOf(ip);
            if (index > -1) {
                // let's reload the file first in case someone has modified it manually
                await this._processAllowFile();
                console.log(`Removing IP ${ip} from allow file.`);
                this.allowedIps.splice(index, 1);
                fs.writeFileSync(this.allowIpsFile, this.allowedIps.join(EOL));
            }
        }
    }
}
