// build localStorage keys per user so cached stuff stays separate
export const getCachedFeedKey = (uid) => `yapsieCachedFeed_${uid}`;
export const getOfflinePostsKey = (uid) => `yapsieOfflinePosts_${uid}`;
export const getCachedProfilesKey = (uid) => `yapsieCachedProfiles_${uid}`;
export const getCachedOwnAvatarKey = (uid) => `yapsieCachedOwnAvatar_${uid}`;

// turn a blob into a data url so it can be previewed or stored more easily
export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    // once file reading is done, return the result
    reader.onloadend = () => resolve(reader.result || "");

    // if reading fails, reject the promise
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });

// make posts safe to save into localStorage
// dates cannot be stored properly as Date objects, so turn them into numbers
export const serialisePostsForStorage = (items) => {
  return items.map((post) => ({
    ...post,
    createdAtMs: post.createdAt instanceof Date ? post.createdAt.getTime() : null,
    createdAt: undefined,
  }));
};

// turn stored post data back into the shape the app expects
export const parseStoredPosts = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((post) => ({
    ...post,

    // turn saved timestamp number back into a real Date object
    createdAt: post.createdAtMs ? new Date(post.createdAtMs) : null,

    // make sure these are always true/false
    likedByMe: !!post.likedByMe,
    repostedByMe: !!post.repostedByMe,
  }));
};

// get cached version of the current user's own avatar from localStorage
export const readCachedOwnAvatar = (uid) => {
  if (!uid) return "";

  try {
    return localStorage.getItem(getCachedOwnAvatarKey(uid)) || "";
  } catch (error) {
    console.error("error reading cached own avatar:", error);
    return "";
  }
};

// save current user's avatar into localStorage for quicker loading later
export const writeCachedOwnAvatar = (uid, value) => {
  if (!uid || !value) return;

  try {
    localStorage.setItem(getCachedOwnAvatarKey(uid), value);
  } catch (error) {
    console.error("error writing cached own avatar:", error);
  }
};

// read cached profile info for users already seen in the feed
export const readCachedProfiles = (uid) => {
  if (!uid) return {};

  try {
    const raw = localStorage.getItem(getCachedProfilesKey(uid));
    const parsed = raw ? JSON.parse(raw) : {};

    // only return it if it is actually an object
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("error reading cached profiles:", error);
    return {};
  }
};

// save cached profile info into localStorage
export const writeCachedProfiles = (uid, profiles) => {
  if (!uid) return;

  try {
    localStorage.setItem(getCachedProfilesKey(uid), JSON.stringify(profiles));
  } catch (error) {
    console.error("error writing cached profiles:", error);
  }
};

// pull name, username, and avatar from posts and store them as cached profiles
// this helps the feed still show user info quickly even before fresh profile data comes in
export const cacheProfilesFromPosts = (uid, items) => {
  if (!uid || !Array.isArray(items)) return;

  const existing = readCachedProfiles(uid);
  const next = { ...existing };

  for (const post of items) {
    if (!post?.authorId) continue;

    next[post.authorId] = {
      uid: post.authorId,

      // use fresh post data if available, otherwise keep older cached value
      name: post.name || existing?.[post.authorId]?.name || "",
      username: post.username || existing?.[post.authorId]?.username || "",
      avatarUrl: post.avatarUrl || existing?.[post.authorId]?.avatarUrl || "",
    };
  }

  writeCachedProfiles(uid, next);
};

// save visible feed posts into localStorage for offline use or faster loading
export const cacheVisibleFeed = (uid, items) => {
  if (!uid) return;

  try {
    localStorage.setItem(
      getCachedFeedKey(uid),
      JSON.stringify(serialisePostsForStorage(items))
    );
  } catch (error) {
    console.error("error caching feed:", error);
  }
};