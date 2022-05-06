import moment from 'moment';

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
        let previousDate = docs.length > 0 ? docs[0].time : null;
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
            // calculate the time elapsed between the previous and the current request
            doc.after = (doc.time.getTime() - previousDate.getTime()) / 1000;
            previousDate = doc.time;
            doc.formattedDate = moment(doc.time).format('HH:mm DD-MM-YYYY');
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
        this.bytes = this._formatBytes(totalSize);
    }
    requestsRepetitionSearch() {
        return this.docs.length;
    }

    getRequestsPerDate() {
        const requestsPerMinuteObject = {};
        const requestsPerHourObject = {};
        for(const doc of this.docs) {
            const minuteKey = moment(doc.time).format('HH:mm DD-MM-YYYY');
            if(!requestsPerMinuteObject[minuteKey]){
                requestsPerMinuteObject[minuteKey] = {all: 0};
                for (const statusCode of this.statusCodes) {
                    requestsPerMinuteObject[minuteKey][statusCode[0]] = 0;
                }
            }
            requestsPerMinuteObject[minuteKey].all++;
            requestsPerMinuteObject[minuteKey][doc.status]++;

            const hourKey = moment(doc.time).format('HH DD-MM-YYYY');
            if(!requestsPerHourObject[hourKey]){
                requestsPerHourObject[hourKey] = {all: 0};
                for (const statusCode of this.statusCodes) {
                    requestsPerHourObject[hourKey][statusCode[0]] = 0;
                }
            }
            requestsPerHourObject[hourKey].all++;
            requestsPerHourObject[hourKey][doc.status]++;
        }

        const minuteLabels = [];
        const minuteDatasets = {all: []};
        for (const statusCode of this.statusCodes) {
            minuteDatasets[statusCode[0]] = [];
        }
        for (const minuteArray of Object.entries(requestsPerMinuteObject)){
            minuteLabels.push(`'${minuteArray[0]}'`);
            minuteDatasets.all.push(minuteArray[1].all);
            for (const statusCode of this.statusCodes) {
                minuteDatasets[statusCode[0]].push(minuteArray[1][statusCode[0]]);
            }
        }

        const hourLabels = [];
        const hourDatasets = {all: []};
        for (const statusCode of this.statusCodes) {
            hourDatasets[statusCode[0]] = [];
        }
        for (const hourArray of Object.entries(requestsPerHourObject)){
            hourLabels.push(`'${hourArray[0]}'`);
            hourDatasets.all.push(hourArray[1].all);
            for (const statusCode of this.statusCodes) {
                hourDatasets[statusCode[0]].push(hourArray[1][statusCode[0]]);
            }
        }
        return {minuteLabels, minuteDatasets, hourLabels, hourDatasets};
    }

    _formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}
