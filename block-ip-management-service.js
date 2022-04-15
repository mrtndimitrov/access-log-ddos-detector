class BlockIpManagementService {
    provided = false;
    constructor(argv) {
        const blockIpsFile = argv['block-ips-file'] ? argv['block-ips-file'] : (argv['b'] ? argv['b'] : null);
    }
}
exports.BlockIpManagementService = BlockIpManagementService;
