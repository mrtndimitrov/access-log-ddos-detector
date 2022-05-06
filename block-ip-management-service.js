import fs from 'fs';
import { DbService } from './db-service.js';
import { EOL } from 'os';

export class BlockIpManagementService {
    blockIpsFile = null;
    db = null;
    ips = [];

    constructor(argv) {
        this.blockIpsFile = argv['block-ips-file'] ? argv['block-ips-file'] : (argv['b'] ? argv['b'] : null);
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            this._processBlockFile();
        }
    }
    async _processBlockFile(){
        this.db = await DbService.getInstance();
        const allFileContents = fs.readFileSync(this.blockIpsFile, 'utf-8');
        this.ips = allFileContents.split(/\r?\n/);
        for (const ip of this.ips) {
            console.log(`IP ${ip} found in BLOCK file. Adding it in our DB.`);
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

    block(ip) {
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            if (this.ips.indexOf(ip) === -1) {
                console.log(`Adding IP ${ip} to block file`);
                this.ips.push(ip);
                fs.writeFileSync(this.blockIpsFile, this.ips.join(EOL));
            }
        }
    }
    unblock(ip) {
        if (this.blockIpsFile && fs.existsSync(this.blockIpsFile)) {
            const index = this.ips.indexOf(ip);
            if (index > -1) {
                console.log(`Removing IP ${ip} to block file`);
                this.ips.splice(index, 1);
                fs.writeFileSync(this.blockIpsFile, this.ips.join(EOL));
            }
        }
    }
}
