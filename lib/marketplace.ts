import "server-only";

import { sql } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export type ListingType = "sell" | "buy" | "free" | "looking" | "exchange" | "service";
export type ListingCategory =
  | "auto"
  | "electronics"
  | "home"
  | "clothes"
  | "services"
  | "jobs"
  | "animals"
  | "other";
export type PriceType = "fixed" | "negotiable" | "free";
export type ListingStatus = "active" | "reserved" | "sold" | "archived";
export type Condition = "new" | "used";

export type ListingSummary = {
  id: number;
  ownerId: number;
  type: ListingType;
  category: ListingCategory;
  title: string;
  price: number | null;
  priceType: PriceType;
  city: string;
  status: ListingStatus;
  urgent: boolean;
  photoUrl: string | null;
  createdAt: string;
};

const LISTING_COLUMNS = sql`
  marketplace_listings.id as id,
  marketplace_listings.owner_id as "ownerId",
  marketplace_listings.type as type,
  marketplace_listings.category as category,
  marketplace_listings.title as title,
  marketplace_listings.price as price,
  marketplace_listings.price_type as "priceType",
  marketplace_listings.city as city,
  marketplace_listings.status as status,
  marketplace_listings.urgent as urgent,
  (CASE WHEN array_length(marketplace_listings.photo_urls, 1) > 0
    THEN marketplace_listings.photo_urls[1] ELSE NULL END) as "photoUrl",
  marketplace_listings.created_at as "createdAt"
`;

export type ListingFilters = {
  query?: string;
  category?: ListingCategory;
  city?: string;
  type?: ListingType;
  priceMin?: number;
  priceMax?: number;
  condition?: Condition;
  photoOnly?: boolean;
  sort?: "newest" | "cheap" | "expensive";
  limit?: number;
};

export async function listListings(filters: ListingFilters = {}): Promise<ListingSummary[]> {
  const {
    query,
    category,
    city,
    type,
    priceMin,
    priceMax,
    condition,
    photoOnly,
    sort = "newest",
    limit = 60,
  } = filters;

  const q = query?.trim() ? `%${query.trim()}%` : null;

  const orderBy =
    sort === "cheap"
      ? sql`marketplace_listings.price ASC NULLS LAST`
      : sort === "expensive"
      ? sql`marketplace_listings.price DESC NULLS LAST`
      : sql`marketplace_listings.bumped_at DESC`;

  return sql<ListingSummary[]>`
    SELECT ${LISTING_COLUMNS}
    FROM marketplace_listings
    WHERE marketplace_listings.status = 'active'
      ${q ? sql`AND (marketplace_listings.title ILIKE ${q} OR marketplace_listings.description ILIKE ${q})` : sql``}
      ${category ? sql`AND marketplace_listings.category = ${category}` : sql``}
      ${city ? sql`AND marketplace_listings.city = ${city}` : sql``}
      ${type ? sql`AND marketplace_listings.type = ${type}` : sql``}
      ${priceMin !== undefined ? sql`AND marketplace_listings.price >= ${priceMin}` : sql``}
      ${priceMax !== undefined ? sql`AND marketplace_listings.price <= ${priceMax}` : sql``}
      ${condition ? sql`AND marketplace_listings.condition = ${condition}` : sql``}
      ${photoOnly ? sql`AND array_length(marketplace_listings.photo_urls, 1) > 0` : sql``}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;
}

export async function getRecentListings(limit: number, city?: string): Promise<ListingSummary[]> {
  return sql<ListingSummary[]>`
    SELECT ${LISTING_COLUMNS}
    FROM marketplace_listings
    WHERE marketplace_listings.status = 'active'
      ${city ? sql`AND marketplace_listings.city = ${city}` : sql``}
    ORDER BY marketplace_listings.bumped_at DESC
    LIMIT ${limit}
  `;
}

export async function listListingsByOwner(ownerId: number): Promise<ListingSummary[]> {
  return sql<ListingSummary[]>`
    SELECT ${LISTING_COLUMNS}
    FROM marketplace_listings
    WHERE marketplace_listings.owner_id = ${ownerId}
    ORDER BY marketplace_listings.id DESC
  `;
}

export type Listing = {
  id: number;
  ownerId: number;
  type: ListingType;
  category: ListingCategory;
  title: string;
  description: string;
  price: number | null;
  priceType: PriceType;
  city: string;
  condition: Condition | null;
  status: ListingStatus;
  urgent: boolean;
  exchangePossible: boolean;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
  owner: {
    id: number;
    name: string;
    avatarUrl: string | null;
    avatarPreset: string | null;
    verified: boolean;
    ratingAverage: number;
    ratingCount: number;
  };
};

type ListingDetailRow = {
  id: number;
  owner_id: number;
  type: ListingType;
  category: ListingCategory;
  title: string;
  description: string;
  price: number | null;
  price_type: PriceType;
  city: string;
  condition: Condition | null;
  status: ListingStatus;
  urgent: boolean;
  exchange_possible: boolean;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_avatar_url: string | null;
  owner_avatar_preset: string | null;
  owner_verified: boolean;
  owner_rating: number | null;
  owner_reviews_count: string;
};

export async function getListingById(id: number): Promise<Listing | null> {
  if (!Number.isInteger(id) || id <= 0) return null;

  const rows = await sql<ListingDetailRow[]>`
    SELECT
      l.id, l.owner_id, l.type, l.category, l.title, l.description, l.price,
      l.price_type, l.city, l.condition, l.status, l.urgent, l.exchange_possible,
      l.photo_urls, l.created_at, l.updated_at,
      u.name as owner_name, u.avatar_url as owner_avatar_url, u.avatar_preset as owner_avatar_preset,
      (u.verification_status = 'approved') as owner_verified,
      (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as owner_rating,
      (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as owner_reviews_count
    FROM marketplace_listings l
    JOIN users u ON u.id = l.owner_id
    WHERE l.id = ${id}
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    ownerId: row.owner_id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    price: row.price,
    priceType: row.price_type,
    city: row.city,
    condition: row.condition,
    status: row.status,
    urgent: row.urgent,
    exchangePossible: row.exchange_possible,
    photoUrls: row.photo_urls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      avatarUrl: row.owner_avatar_url,
      avatarPreset: row.owner_avatar_preset,
      verified: row.owner_verified,
      ratingAverage: row.owner_rating ? Math.round(row.owner_rating * 10) / 10 : 0,
      ratingCount: Number(row.owner_reviews_count),
    },
  };
}

/** Номер раскрывается только залогиненному пользователю и только если продавец подтвердил телефон. */
export async function getSellerPhoneIfConfirmed(listingId: number): Promise<string | null> {
  const rows = await sql<{ phone: string | null; phone_confirmed_at: string | null }[]>`
    SELECT users.phone as phone, users.phone_confirmed_at as phone_confirmed_at
    FROM marketplace_listings
    JOIN users ON users.id = marketplace_listings.owner_id
    WHERE marketplace_listings.id = ${listingId}
  `;

  const row = rows[0];
  if (!row || !row.phone || !row.phone_confirmed_at) return null;

  return row.phone;
}

export async function getListingOwnerId(id: number): Promise<number | null> {
  const rows = await sql<{ owner_id: number }[]>`
    SELECT owner_id FROM marketplace_listings WHERE id = ${id}
  `;
  return rows[0]?.owner_id ?? null;
}

export type ListingInput = {
  type: ListingType;
  category: ListingCategory;
  title: string;
  description: string;
  price: number | null;
  priceType: PriceType;
  city: string;
  condition: Condition | null;
  urgent: boolean;
  exchangePossible: boolean;
  photoUrls: string[];
};

export async function isMarketplaceBanned(userId: number): Promise<boolean> {
  const rows = await sql<{ marketplace_banned: boolean }[]>`
    SELECT marketplace_banned FROM users WHERE id = ${userId}
  `;
  return rows[0]?.marketplace_banned ?? false;
}

export async function setMarketplaceBanned(userId: number, banned: boolean): Promise<void> {
  await sql`UPDATE users SET marketplace_banned = ${banned} WHERE id = ${userId}`;
}

export async function countActiveListingsByOwner(ownerId: number): Promise<number> {
  const rows = await sql<{ c: string }[]>`
    SELECT COUNT(*) as c FROM marketplace_listings WHERE owner_id = ${ownerId} AND status = 'active'
  `;
  return Number(rows[0].c);
}

export async function createListing(input: ListingInput, ownerId: number): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO marketplace_listings (
      owner_id, type, category, title, description, price, price_type, city,
      condition, urgent, exchange_possible, photo_urls
    ) VALUES (
      ${ownerId}, ${input.type}, ${input.category}, ${input.title}, ${input.description},
      ${input.price}, ${input.priceType}, ${input.city}, ${input.condition}, ${input.urgent},
      ${input.exchangePossible}, ${input.photoUrls}
    )
    RETURNING id
  `;
  return rows[0].id;
}

/**
 * Уведомляет пользователей, у кого сохранённый поиск подходит под новое
 * объявление — только в момент публикации (не по расписанию), поэтому один
 * и тот же listing никогда не отправит одному поиску больше одного пуша.
 * От повторного пуша при пачке объявлений подряд защищает last_notified_at.
 */
export async function notifySavedSearchMatches(
  listingId: number,
  input: ListingInput,
  ownerId: number
): Promise<void> {
  const q = input.title.toLowerCase();

  const matches = await sql<{ id: number; user_id: number }[]>`
    SELECT id, user_id FROM marketplace_saved_searches
    WHERE notify = true
      AND user_id != ${ownerId}
      AND (category IS NULL OR category = ${input.category})
      AND (city IS NULL OR city = ${input.city})
      AND (price_min IS NULL OR ${input.price} IS NULL OR ${input.price} >= price_min)
      AND (price_max IS NULL OR ${input.price} IS NULL OR ${input.price} <= price_max)
      AND (query = '' OR ${q} ILIKE '%' || query || '%')
      AND (last_notified_at IS NULL
        OR last_notified_at < to_char(now() AT TIME ZONE 'utc' - interval '5 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
  `;

  for (const m of matches) {
    sendPushToUser(m.user_id, {
      title: "Новое объявление по вашему поиску",
      body: input.title,
      url: `/marketplace/${listingId}`,
    });
  }

  if (matches.length > 0) {
    await sql`
      UPDATE marketplace_saved_searches
      SET last_notified_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      WHERE id = ANY(${matches.map((m) => m.id)})
    `;
  }
}

export async function updateListing(
  id: number,
  ownerId: number,
  input: ListingInput
): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    UPDATE marketplace_listings SET
      type = ${input.type},
      category = ${input.category},
      title = ${input.title},
      description = ${input.description},
      price = ${input.price},
      price_type = ${input.priceType},
      city = ${input.city},
      condition = ${input.condition},
      urgent = ${input.urgent},
      exchange_possible = ${input.exchangePossible},
      photo_urls = ${input.photoUrls},
      updated_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function setListingStatus(
  id: number,
  ownerId: number,
  status: ListingStatus
): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    UPDATE marketplace_listings SET status = ${status},
      updated_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Поднять объявление — не чаще раза в 24 часа. */
export async function bumpListing(id: number, ownerId: number): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    UPDATE marketplace_listings SET bumped_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${id} AND owner_id = ${ownerId} AND status = 'active'
      AND bumped_at < to_char(now() AT TIME ZONE 'utc' - interval '24 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    RETURNING id
  `;
  return rows.length > 0;
}

// --- избранное ---

export async function setFavorite(userId: number, listingId: number, on: boolean): Promise<void> {
  if (on) {
    await sql`
      INSERT INTO marketplace_favorites (user_id, listing_id) VALUES (${userId}, ${listingId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await sql`DELETE FROM marketplace_favorites WHERE user_id = ${userId} AND listing_id = ${listingId}`;
  }
}

export async function isFavorited(userId: number, listingId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM marketplace_favorites WHERE user_id = ${userId} AND listing_id = ${listingId}
  `;
  return rows.length > 0;
}

export async function listFavoriteListings(userId: number): Promise<ListingSummary[]> {
  return sql<ListingSummary[]>`
    SELECT ${LISTING_COLUMNS}
    FROM marketplace_listings
    JOIN marketplace_favorites ON marketplace_favorites.listing_id = marketplace_listings.id
    WHERE marketplace_favorites.user_id = ${userId}
    ORDER BY marketplace_favorites.created_at DESC
  `;
}

// --- подписка на продавца ---

export async function setSellerFollow(
  followerId: number,
  sellerId: number,
  on: boolean
): Promise<void> {
  if (on) {
    await sql`
      INSERT INTO marketplace_seller_follows (follower_id, seller_id) VALUES (${followerId}, ${sellerId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await sql`
      DELETE FROM marketplace_seller_follows WHERE follower_id = ${followerId} AND seller_id = ${sellerId}
    `;
  }
}

export async function isFollowingSeller(followerId: number, sellerId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM marketplace_seller_follows WHERE follower_id = ${followerId} AND seller_id = ${sellerId}
  `;
  return rows.length > 0;
}

// --- чат по объявлению ---

export async function linkConversationToListing(
  conversationId: number,
  listingId: number
): Promise<void> {
  await sql`
    INSERT INTO marketplace_conversation_links (conversation_id, listing_id, updated_at)
    VALUES (${conversationId}, ${listingId}, to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    ON CONFLICT (conversation_id) DO UPDATE SET
      listing_id = EXCLUDED.listing_id, updated_at = EXCLUDED.updated_at
  `;
}

export type ConversationListingContext = {
  id: number;
  title: string;
  price: number | null;
  priceType: PriceType;
  status: ListingStatus;
  photoUrl: string | null;
};

export async function getListingForConversation(
  conversationId: number
): Promise<ConversationListingContext | null> {
  const rows = await sql<ConversationListingContext[]>`
    SELECT
      marketplace_listings.id as id,
      marketplace_listings.title as title,
      marketplace_listings.price as price,
      marketplace_listings.price_type as "priceType",
      marketplace_listings.status as status,
      (CASE WHEN array_length(marketplace_listings.photo_urls, 1) > 0
        THEN marketplace_listings.photo_urls[1] ELSE NULL END) as "photoUrl"
    FROM marketplace_conversation_links
    JOIN marketplace_listings ON marketplace_listings.id = marketplace_conversation_links.listing_id
    WHERE marketplace_conversation_links.conversation_id = ${conversationId}
  `;
  return rows[0] ?? null;
}

// --- сохранённый поиск ---

export type SavedSearch = {
  id: number;
  query: string;
  category: ListingCategory | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
  notify: boolean;
  createdAt: string;
};

export async function listSavedSearches(userId: number): Promise<SavedSearch[]> {
  return sql<SavedSearch[]>`
    SELECT id, query, category, city, price_min as "priceMin", price_max as "priceMax",
           notify, created_at as "createdAt"
    FROM marketplace_saved_searches
    WHERE user_id = ${userId}
    ORDER BY id DESC
  `;
}

export type SavedSearchInput = {
  query: string;
  category: ListingCategory | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
  notify: boolean;
};

export async function createSavedSearch(userId: number, input: SavedSearchInput): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO marketplace_saved_searches (user_id, query, category, city, price_min, price_max, notify)
    VALUES (${userId}, ${input.query}, ${input.category}, ${input.city}, ${input.priceMin}, ${input.priceMax}, ${input.notify})
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteSavedSearch(id: number, userId: number): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    DELETE FROM marketplace_saved_searches WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}

// --- профиль продавца ---

export type SellerStats = { active: number; completed: number };

export async function getSellerStats(userId: number): Promise<SellerStats> {
  const rows = await sql<{ active: string; completed: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'sold') as completed
    FROM marketplace_listings
    WHERE owner_id = ${userId}
  `;
  return { active: Number(rows[0].active), completed: Number(rows[0].completed) };
}

// --- сделка и отзыв ---

export type ConfirmDealResult =
  | { ok: true; matched: boolean }
  | { ok: false; reason: "not_found" | "not_sold" | "already_matched_other" | "not_participant" };

/**
 * Обе стороны должны подтвердить сделку независимо: владелец —
 * deal_confirmed_owner, первый покупатель, кто нажал — deal_confirmed_buyer_id.
 * Если сделку уже подтвердил другой покупатель, новый подтвердить не может —
 * это и защита от накрутки, и признак того, что сделка не с ним.
 */
export async function confirmDeal(listingId: number, userId: number): Promise<ConfirmDealResult> {
  const rows = await sql<
    { owner_id: number; status: ListingStatus; deal_confirmed_buyer_id: number | null }[]
  >`
    SELECT owner_id, status, deal_confirmed_buyer_id FROM marketplace_listings WHERE id = ${listingId}
  `;

  const listing = rows[0];
  if (!listing) return { ok: false, reason: "not_found" };
  if (listing.status !== "sold") return { ok: false, reason: "not_sold" };

  if (userId === listing.owner_id) {
    await sql`UPDATE marketplace_listings SET deal_confirmed_owner = true WHERE id = ${listingId}`;
  } else {
    if (listing.deal_confirmed_buyer_id !== null && listing.deal_confirmed_buyer_id !== userId) {
      return { ok: false, reason: "already_matched_other" };
    }

    // Подтвердить сделку как покупатель может только тот, кто реально писал
    // продавцу по этому объявлению — иначе кто угодно залогиненный мог бы
    // "присвоить" себе чужую сделку и накрутить отзыв.
    const wroteToSeller = await sql`
      SELECT 1 FROM marketplace_conversation_links
      JOIN conversation_participants ON conversation_participants.conversation_id = marketplace_conversation_links.conversation_id
      WHERE marketplace_conversation_links.listing_id = ${listingId}
        AND conversation_participants.user_id = ${userId}
    `;

    if (wroteToSeller.length === 0) return { ok: false, reason: "not_participant" };

    await sql`UPDATE marketplace_listings SET deal_confirmed_buyer_id = ${userId} WHERE id = ${listingId}`;
  }

  const updated = await sql<
    { deal_confirmed_owner: boolean; deal_confirmed_buyer_id: number | null }[]
  >`
    SELECT deal_confirmed_owner, deal_confirmed_buyer_id FROM marketplace_listings WHERE id = ${listingId}
  `;

  const matched = updated[0].deal_confirmed_owner && updated[0].deal_confirmed_buyer_id !== null;

  return { ok: true, matched };
}

// --- админка ---

export type AdminListingRow = ListingSummary & {
  ownerName: string;
};

export async function listAllListingsForAdmin(status?: ListingStatus): Promise<AdminListingRow[]> {
  return sql<AdminListingRow[]>`
    SELECT ${LISTING_COLUMNS}, users.name as "ownerName"
    FROM marketplace_listings
    JOIN users ON users.id = marketplace_listings.owner_id
    ${status ? sql`WHERE marketplace_listings.status = ${status}` : sql``}
    ORDER BY marketplace_listings.id DESC
    LIMIT 200
  `;
}

export type MarketplaceAdminStats = {
  active: number;
  newToday: number;
  totalReports: number;
  newReports: number;
};

export async function getMarketplaceAdminStats(): Promise<MarketplaceAdminStats> {
  const rows = await sql<
    { active: string; new_today: string; total_reports: string; new_reports: string }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM marketplace_listings WHERE status = 'active') as active,
      (SELECT COUNT(*) FROM marketplace_listings
        WHERE created_at > to_char(now() AT TIME ZONE 'utc' - interval '24 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) as new_today,
      (SELECT COUNT(*) FROM marketplace_reports) as total_reports,
      (SELECT COUNT(*) FROM marketplace_reports WHERE seen_at IS NULL) as new_reports
  `;

  const row = rows[0];

  return {
    active: Number(row.active),
    newToday: Number(row.new_today),
    totalReports: Number(row.total_reports),
    newReports: Number(row.new_reports),
  };
}

export async function adminSetListingStatus(id: number, status: ListingStatus): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    UPDATE marketplace_listings SET status = ${status},
      updated_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function canReviewListing(
  listingId: number,
  userId: number
): Promise<{ ok: true; otherUserId: number } | { ok: false }> {
  const rows = await sql<
    { owner_id: number; deal_confirmed_owner: boolean; deal_confirmed_buyer_id: number | null }[]
  >`
    SELECT owner_id, deal_confirmed_owner, deal_confirmed_buyer_id
    FROM marketplace_listings WHERE id = ${listingId}
  `;

  const listing = rows[0];
  if (!listing || !listing.deal_confirmed_owner || listing.deal_confirmed_buyer_id === null) {
    return { ok: false };
  }

  if (userId === listing.owner_id) return { ok: true, otherUserId: listing.deal_confirmed_buyer_id };
  if (userId === listing.deal_confirmed_buyer_id) return { ok: true, otherUserId: listing.owner_id };

  return { ok: false };
}
