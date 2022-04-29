export class PatternRecognitionService {
    docs = [];
    uniqueRequests = [];
    bytes = '';
    statusCodes = [];
    userAgents = [];
    constructor(docs) {
        this.docs = docs;
        const uniqueRequestsObject = {};
        const statusCodesObject = {};
        const userAgentsObject = {};
        let totalSize = 0;
        for(const doc of docs) {
            const uniqueRequestsKey = `${doc.request}${doc.method}${doc.status}`;
            if(!uniqueRequestsObject[uniqueRequestsKey]){
                uniqueRequestsObject[uniqueRequestsKey] = {request: doc.request, method: doc.method, status: doc.status, num: 0};
            }
            if(!statusCodesObject[doc.status]){
                statusCodesObject[doc.status] = 0;
            }
            if(!userAgentsObject[doc.user_agent]){
                userAgentsObject[doc.user_agent] = 0;
            }
            uniqueRequestsObject[uniqueRequestsKey].num++;
            statusCodesObject[doc.status]++;
            userAgentsObject[doc.user_agent]++;
            totalSize += parseInt(doc.size, 10);
        }
        this.uniqueRequests = Object.entries(uniqueRequestsObject);
        this.uniqueRequests.sort((a, b) => {
            return a[1].num < b[1].num ? 1 : -1;
        });
        this.statusCodes = Object.entries(statusCodesObject);
        this.statusCodes.sort((a, b) => {
            return a[1] < b[1] ? 1 : -1;
        });
        this.userAgents = Object.entries(userAgentsObject);
        this.userAgents.sort((a, b) => {
            return a[1] < b[1] ? 1 : -1;
        });
        this.bytes = this.formatBytes(totalSize);
    }
    requestsRepetitionSearch() {
        return this.docs.length;
    }

    getRequestsPerMinute() {

    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}
