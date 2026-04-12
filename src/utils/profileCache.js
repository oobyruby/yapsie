// build a unique cache key per user and per data type
// this keeps profile cache separated (posts, media, favourites, etc)
export const getProfileCacheKey = (uid, key) => `yapsieProfileCache_${uid}_${key}`;

// convert posts into a version safe to store in localStorage
// dates are turned into strings because localStorage cannot store Date objects
export const serialisePosts = (posts) => {
  return posts.map((post) => ({
    ...post,
    createdAt: post.createdAt ? post.createdAt.toISOString() : null,
    updatedAt: post.updatedAt ? post.updatedAt.toISOString() : null,
    editedAt: post.editedAt ? post.editedAt.toISOString() : null,
    repostedAt: post.repostedAt ? post.repostedAt.toISOString() : null,
    likedAt: post.likedAt ? post.likedAt.toISOString() : null,
  }));
};

// convert stored post data back into real Date objects
// this restores the posts to the format the app expects
export const deserialisePosts = (posts) => {
  if (!Array.isArray(posts)) return [];

  return posts.map((post) => ({
    ...post,
    createdAt: post.createdAt ? new Date(post.createdAt) : null,
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
    editedAt: post.editedAt ? new Date(post.editedAt) : null,
    repostedAt: post.repostedAt ? new Date(post.repostedAt) : null,
    likedAt: post.likedAt ? new Date(post.likedAt) : null,
  }));
};

// read cached profile data from localStorage
// fallback is returned if nothing exists or parsing fails
export const readProfileCache = (uid, key, fallback) => {
  try {
    const raw = localStorage.getItem(getProfileCacheKey(uid, key));

    // if nothing cached yet, return fallback value
    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch (error) {
    console.error(`error reading cached ${key}:`, error);
    return fallback;
  }
};

// save profile data into localStorage cache
// used for posts, media, favourites, etc
export const writeProfileCache = (uid, key, value) => {
  try {
    localStorage.setItem(
      getProfileCacheKey(uid, key),
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(`error writing cached ${key}:`, error);
  }
};