// convert a date into short "time ago" text like 5s, 3m, 2h, 1d
export const formatTimeAgo = (date) => {
  // if no date, just show now
  if (!date) return "now";

  // calculate time difference in seconds
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  // under 60 seconds
  if (seconds < 60) return `${seconds}s ago`;

  // convert to minutes
  const minutes = Math.floor(seconds / 60);

  // under 60 minutes
  if (minutes < 60) return `${minutes}m ago`;

  // convert to hours
  const hours = Math.floor(minutes / 60);

  // under 24 hours
  if (hours < 24) return `${hours}h ago`;

  // otherwise show days
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// format draft timestamp into readable saved time
export const formatDraftTime = (timestamp) => {
  // if no timestamp, just show saved
  if (!timestamp) return "saved";

  // convert timestamp into readable local date/time
  return new Date(timestamp).toLocaleString();
};

// get first letter for avatar fallback
// used when user has no profile image
export const getProfileInitial = (profile) => {
  return (profile?.name || profile?.username || "y")
    .charAt(0)
    .toUpperCase();
};