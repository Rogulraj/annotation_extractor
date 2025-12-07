import moment from 'moment';

function getDifferenceInSeconds(date1: Date, date2: Date) {
  const diffInMs = Math.abs(date2.valueOf() - date1.valueOf());
  return diffInMs / 1000;
}

function getTimeFromNow(date: string): string {
  const givenDate = moment(date);
  return givenDate.fromNow();
}

function getUnixTimeStamp(): number {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  return unixTimestamp
}

function getShorthandTimeFromNow(date: string): string {
  const givenDate = moment(date);
  return givenDate.fromNow()
                  .replace("minute", "min")
                  .replace("minutes", "mins")
                  .replace('hour', 'hr')
                  .replace('hours', 'hrs')
                  .replace('second', 'sec')
                  .replace('seconds', 'secs')
}

export { getDifferenceInSeconds, getTimeFromNow, getUnixTimeStamp, getShorthandTimeFromNow };
