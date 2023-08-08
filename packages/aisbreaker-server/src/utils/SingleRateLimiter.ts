
const NUM_OF_TIMESLOTS_PER_INTERVAL = 100
const debug = true

export class SingleRateLimiter {
  millisPerTimeslot: number

  // index: timeslot; value: requests in this timeslot
  requestsPerTimeslot = new Map<number, number>()

  constructor(public maxRequestsPerInterval: number, public intervalSeconds: number) {
    this.millisPerTimeslot = intervalSeconds * 1000 / NUM_OF_TIMESLOTS_PER_INTERVAL
  }

  getTimeslot(requestTime: Date): number {
    // get time slot
    const timeSlot = Math.floor(requestTime.getTime() / this.millisPerTimeslot)
    return timeSlot
  }

  protected deleteAllOutdatedTimeslots(currentTime: Date) {
    const oldestNeededTime = new Date(currentTime.getTime() - 1000*this.intervalSeconds)
    const oldestNeededTimeslotIndex = this.getTimeslot(oldestNeededTime)

    // delete all outdated time slots
    for(let timeslot of this.requestsPerTimeslot.keys()) {
      if (timeslot < oldestNeededTimeslotIndex) {
        this.requestsPerTimeslot.delete(timeslot)
      }
    }
  }


  /**
   * Check whether a request is allowed or not. If it is allowed, the request will be counted.
   * 
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns true if the request is allowed, false otherwise
   */
  isRequestAllowed(requestWeight: number = 1, requestTime: Date = new Date()): boolean {
    if (debug) {
      this.logStatus("Before deleteAllOutdatedTimeslots:")
    }

    // cleanup first to get correct result
    this.deleteAllOutdatedTimeslots(requestTime)
    if (debug) {
      this.logStatus("After deleteAllOutdatedTimeslots:")
    }

    // check if the limit is already rached
    const sumRequestsOfAllTimeslots = Array.from(this.requestsPerTimeslot.values()).reduce((a, b) => a + b, 0)
    if (sumRequestsOfAllTimeslots + requestWeight > this.maxRequestsPerInterval) {
      // limit reached: request us denied
      return false
    }
    // limit is not reached: count request

    // get request time slot
    const requestTimeslot = this.getTimeslot(requestTime)

    // increase number of requests in request time slot
    const requestsInCurrentTimeSlot = this.requestsPerTimeslot.get(requestTimeslot) || 0
    this.requestsPerTimeslot.set(requestTimeslot, requestsInCurrentTimeSlot+requestWeight)

    // request is allowed
    if (debug) {
      this.logStatus("At end:")
    }
    return true;
  }

  protected logStatus(msg: string = "") {
    //console.log(`${msg} requestsPerTimeslot: ${JSON.stringify(this.requestsPerTimeslot)}`)
    console.log(`${msg} requestsPerTimeslot:`, this.requestsPerTimeslot)
  }
}






/*


import moment from 'moment';

const redisClient = redis.createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const WINDOW_SIZE_IN_HOURS = 24;
const MAX_WINDOW_REQUEST_COUNT = 100;
const WINDOW_LOG_INTERVAL_IN_HOURS = 1;

export const customRedisRateLimiter = async (req, res, next) => {
  await redisClient.connect();
  try {
    // check that redis client exists
    if (!redisClient) {
      throw new Error('Redis client does not exist!');
      process.exit(1);
    }
    // fetch records of current user using IP address, returns null when no record is found
    const record = await redisClient.get(req.ip);
    const currentRequestTime = moment();
    console.log(record);
    //  if no record is found , create a new record for user and store to redis
    if (record == null) {
      let newRecord = [];
      let requestLog = {
        requestTimeStamp: currentRequestTime.unix(),
        requestCount: 1,
      };
      newRecord.push(requestLog);
      await redisClient.set(req.ip, JSON.stringify(newRecord));
      next();
    }
    // if record is found, parse it's value and calculate number of requests users has made within the last window
    let data = JSON.parse(record);
    let windowStartTimestamp = moment().subtract(WINDOW_SIZE_IN_HOURS, 'hours').unix();
    let requestsWithinWindow = data.filter((entry) => {
      return entry.requestTimeStamp > windowStartTimestamp;
    });
    console.log('requestsWithinWindow', requestsWithinWindow);
    let totalWindowRequestsCount = requestsWithinWindow.reduce((accumulator, entry) => {
      return accumulator + entry.requestCount;
    }, 0);
    // if number of requests made is greater than or equal to the desired maximum, return error
    if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
      res.status(429).jsend.error(`You have exceeded the ${MAX_WINDOW_REQUEST_COUNT} requests in ${WINDOW_SIZE_IN_HOURS} hrs limit!`);
    } else {
      // if number of requests made is less than allowed maximum, log new entry
      let lastRequestLog = data[data.length - 1];
      let potentialCurrentWindowIntervalStartTimeStamp = currentRequestTime.subtract(WINDOW_LOG_INTERVAL_IN_HOURS, 'hours').unix();
      //  if interval has not passed since last request log, increment counter
      if (lastRequestLog.requestTimeStamp > potentialCurrentWindowIntervalStartTimeStamp) {
        lastRequestLog.requestCount++;
        data[data.length - 1] = lastRequestLog;
      } else {
        //  if interval has passed, log new entry for current user and timestamp
        data.push({
          requestTimeStamp: currentRequestTime.unix(),
          requestCount: 1,
        });
      }
      await redisClient.set(req.ip, JSON.stringify(data));
      next();
    }
  } catch (error) {
    next(error);
  }
};

*/