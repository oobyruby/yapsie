// convert a date into short "time ago" text like 5s, 3m, 2h, 1d
export const formatTimeAgo = (date) => {
  // if no date provided, just show now
  if (!date) return "now";

  // calculate difference between now and the date in seconds
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  // if under a minute, show seconds
  if (seconds < 60) return `${seconds}s ago`;

  // convert to minutes
  const minutes = Math.floor(seconds / 60);

  // if under an hour, show minutes
  if (minutes < 60) return `${minutes}m ago`;

  // convert to hours
  const hours = Math.floor(minutes / 60);

  // if under a day, show hours
  if (hours < 24) return `${hours}h ago`;

  // otherwise show days
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};