-- Boards Module - Initial Migration
-- Table prefix: brd_
-- Applied once by the Cactus module migration runner during build.

-- ---------------------------------------------------------------------------
-- Categories (created before boards because boards reference it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_categories" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "title"      TEXT         NOT NULL,
    "position"   INTEGER      NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "brd_categories_position_idx" ON "brd_categories" ("position");

-- ---------------------------------------------------------------------------
-- Boards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_boards" (
    "id"                 TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "category_id"        TEXT,
    "title"              TEXT         NOT NULL,
    "slug"               TEXT         NOT NULL,
    "description"        TEXT,
    "position"           INTEGER      NOT NULL DEFAULT 0,
    -- emoji takes precedence over icon_media_id if both are somehow set
    "icon_emoji"         TEXT,
    -- Media.id; no FK (mirrors InfoPage.ogImageId - render falls back gracefully)
    "icon_media_id"      TEXT,
    "is_locked"          BOOLEAN      NOT NULL DEFAULT false,
    -- 'PUBLIC' | 'MEMBERS' | 'PRIVATE' - sub-boards inherit this, no column of their own
    "visibility"         TEXT         NOT NULL DEFAULT 'PUBLIC',
    -- search-engine opt-out, independent of visibility
    "noindex"            BOOLEAN      NOT NULL DEFAULT false,
    "min_post_length"    INTEGER,
    -- lowercase terms array; hits route new thread/post text to the moderation queue
    "word_filter"        JSONB,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_boards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_boards_slug_unique" UNIQUE ("slug"),
    CONSTRAINT "brd_boards_visibility_check" CHECK ("visibility" IN ('PUBLIC','MEMBERS','PRIVATE')),
    CONSTRAINT "brd_boards_category_fk" FOREIGN KEY ("category_id") REFERENCES "brd_categories" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_boards_category_position_idx" ON "brd_boards" ("category_id", "position");

-- ---------------------------------------------------------------------------
-- Sub-boards (one level of nesting only - enforced by schema shape)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_sub_boards" (
    "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "board_id"    TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "slug"        TEXT         NOT NULL,
    "description" TEXT,
    "position"    INTEGER      NOT NULL DEFAULT 0,
    "is_locked"   BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_sub_boards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_sub_boards_board_slug_unique" UNIQUE ("board_id", "slug"),
    CONSTRAINT "brd_sub_boards_board_fk" FOREIGN KEY ("board_id") REFERENCES "brd_boards" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_sub_boards_board_position_idx" ON "brd_sub_boards" ("board_id", "position");

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_tags" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "name"       TEXT         NOT NULL,
    "slug"       TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_tags_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_tags_slug_unique" UNIQUE ("slug")
);

-- ---------------------------------------------------------------------------
-- Threads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_threads" (
    "id"                       TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "board_id"                 TEXT         NOT NULL,
    "sub_board_id"             TEXT,
    "title"                    TEXT         NOT NULL,
    "slug"                     TEXT         NOT NULL,
    -- Threads survive author deletion
    "author_id"                TEXT,
    -- Display-string snapshot at creation time; survives account deletion
    "author_name"              TEXT         NOT NULL,
    -- Puck Data JSON ({ root, content, zones }) built from the boards thread-opener palette
    "opener_data"              JSONB,
    -- 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'DELETED' | 'ARCHIVED'
    "status"                   TEXT         NOT NULL DEFAULT 'PUBLISHED',
    "is_pinned"                BOOLEAN      NOT NULL DEFAULT false,
    "is_locked"                BOOLEAN      NOT NULL DEFAULT false,
    -- renders pinned above every board/sub-board listing regardless of home board
    "is_global_announcement"   BOOLEAN      NOT NULL DEFAULT false,
    "view_count"               INTEGER      NOT NULL DEFAULT 0,
    -- denormalised, maintained on post create/delete
    "reply_count"              INTEGER      NOT NULL DEFAULT 0,
    -- denormalised, set on post creation only (never edits); drives listing sort
    "last_post_at"             TIMESTAMP(3),
    -- submitter IP, for IP-ban moderation
    "ip_address"               TEXT,
    -- source id for imports, e.g. "phpbb:1234"
    "imported_from"            TEXT,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_threads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_threads_slug_unique" UNIQUE ("slug"),
    CONSTRAINT "brd_threads_status_check" CHECK ("status" IN ('PUBLISHED','PENDING','HIDDEN','DELETED','ARCHIVED')),
    CONSTRAINT "brd_threads_board_fk" FOREIGN KEY ("board_id") REFERENCES "brd_boards" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_threads_sub_board_fk" FOREIGN KEY ("sub_board_id") REFERENCES "brd_sub_boards" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_threads_author_fk" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_threads_board_pinned_last_post_idx" ON "brd_threads" ("board_id", "is_pinned" DESC, "last_post_at" DESC);
CREATE INDEX IF NOT EXISTS "brd_threads_sub_board_last_post_idx"    ON "brd_threads" ("sub_board_id", "last_post_at" DESC);
CREATE INDEX IF NOT EXISTS "brd_threads_author_idx"                ON "brd_threads" ("author_id");
CREATE INDEX IF NOT EXISTS "brd_threads_status_created_idx"        ON "brd_threads" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "brd_threads_imported_from_idx"         ON "brd_threads" ("imported_from");
CREATE INDEX IF NOT EXISTS "brd_threads_global_announcement_idx"   ON "brd_threads" ("is_global_announcement") WHERE "is_global_announcement" = true;
CREATE INDEX IF NOT EXISTS "brd_threads_title_search_idx" ON "brd_threads" USING GIN (to_tsvector('english', "title"));

-- ---------------------------------------------------------------------------
-- Posts (replies - the opener body lives on the thread row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_posts" (
    "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "thread_id"        TEXT         NOT NULL,
    "author_id"        TEXT,
    "author_name"      TEXT         NOT NULL,
    -- sanitised rendered output
    "body_html"        TEXT         NOT NULL,
    -- editor document JSON, source of truth for edits
    "body_source"      JSONB,
    -- quoted-reply pointer; flat rendering, threads stay linear
    "reply_to_post_id" TEXT,
    -- 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'DELETED'
    "status"           TEXT         NOT NULL DEFAULT 'PUBLISHED',
    "edited_at"        TIMESTAMP(3),
    "edited_by"        TEXT,
    "ip_address"       TEXT,
    "imported_from"    TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_posts_status_check" CHECK ("status" IN ('PUBLISHED','PENDING','HIDDEN','DELETED')),
    CONSTRAINT "brd_posts_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_posts_author_fk" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE SET NULL,
    CONSTRAINT "brd_posts_reply_to_fk" FOREIGN KEY ("reply_to_post_id") REFERENCES "brd_posts" ("id") ON DELETE SET NULL,
    CONSTRAINT "brd_posts_edited_by_fk" FOREIGN KEY ("edited_by") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_posts_thread_created_idx"    ON "brd_posts" ("thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "brd_posts_author_idx"            ON "brd_posts" ("author_id");
CREATE INDEX IF NOT EXISTS "brd_posts_status_created_idx"    ON "brd_posts" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "brd_posts_imported_from_idx"     ON "brd_posts" ("imported_from");
CREATE INDEX IF NOT EXISTS "brd_posts_body_search_idx" ON "brd_posts" USING GIN (to_tsvector('english', "body_html"));

-- ---------------------------------------------------------------------------
-- Post revisions (edit history, moderator-visible)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_post_revisions" (
    "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "post_id"     TEXT         NOT NULL,
    "body_html"   TEXT         NOT NULL,
    "body_source" JSONB,
    "edited_by"   TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_post_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_post_revisions_post_fk" FOREIGN KEY ("post_id") REFERENCES "brd_posts" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_post_revisions_edited_by_fk" FOREIGN KEY ("edited_by") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_post_revisions_post_created_idx" ON "brd_post_revisions" ("post_id", "created_at" DESC);

-- ---------------------------------------------------------------------------
-- Thread tags (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_thread_tags" (
    "thread_id" TEXT NOT NULL,
    "tag_id"    TEXT NOT NULL,
    CONSTRAINT "brd_thread_tags_pkey" PRIMARY KEY ("thread_id", "tag_id"),
    CONSTRAINT "brd_thread_tags_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_thread_tags_tag_fk"    FOREIGN KEY ("tag_id")    REFERENCES "brd_tags" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_thread_tags_tag_idx" ON "brd_thread_tags" ("tag_id");

-- ---------------------------------------------------------------------------
-- Drafts (composer auto-save)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_drafts" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"      TEXT         NOT NULL,
    -- set for reply drafts, NULL for new-thread drafts
    "thread_id"    TEXT,
    -- context for new-thread drafts
    "board_id"     TEXT,
    "title"        TEXT,
    "opener_data"  JSONB,
    "body_source"  JSONB,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_drafts_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_drafts_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_drafts_board_fk" FOREIGN KEY ("board_id") REFERENCES "brd_boards" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "brd_drafts_user_thread_unique" ON "brd_drafts" ("user_id", "thread_id") WHERE "thread_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "brd_drafts_user_updated_idx" ON "brd_drafts" ("user_id", "updated_at" DESC);

-- ---------------------------------------------------------------------------
-- Post reactions (registered users only - Boards posting is registered-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_post_reactions" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "post_id"    TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "emoji"      TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_post_reactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_post_reactions_unique" UNIQUE ("post_id", "user_id", "emoji"),
    CONSTRAINT "brd_post_reactions_post_fk" FOREIGN KEY ("post_id") REFERENCES "brd_posts" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_post_reactions_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_post_reactions_post_idx" ON "brd_post_reactions" ("post_id");

-- ---------------------------------------------------------------------------
-- Thread views (anonymous view dedupe, mirrors gz_post_views)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_thread_views" (
    "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "thread_id"     TEXT         NOT NULL,
    "visitor_token" TEXT         NOT NULL,
    "viewed_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_thread_views_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_thread_views_unique" UNIQUE ("thread_id", "visitor_token"),
    CONSTRAINT "brd_thread_views_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Bookmarks (user-saved threads, private to the user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_bookmarks" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "thread_id"  TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_bookmarks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_bookmarks_unique" UNIQUE ("thread_id", "user_id"),
    CONSTRAINT "brd_bookmarks_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_bookmarks_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_bookmarks_user_created_idx" ON "brd_bookmarks" ("user_id", "created_at" DESC);

-- ---------------------------------------------------------------------------
-- Read state (per-user per-thread read tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_read_state" (
    "user_id"           TEXT         NOT NULL,
    "thread_id"         TEXT         NOT NULL,
    "last_read_post_at" TIMESTAMP(3) NOT NULL,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_read_state_pkey" PRIMARY KEY ("user_id", "thread_id"),
    CONSTRAINT "brd_read_state_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_read_state_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_read_state_user_idx" ON "brd_read_state" ("user_id");

-- ---------------------------------------------------------------------------
-- Polls (one optional poll per thread)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_polls" (
    "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "thread_id"      TEXT         NOT NULL,
    "question"       TEXT         NOT NULL,
    "allow_multiple" BOOLEAN      NOT NULL DEFAULT false,
    "closes_at"      TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_polls_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_polls_thread_unique" UNIQUE ("thread_id"),
    CONSTRAINT "brd_polls_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "brd_poll_options" (
    "id"       TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
    "poll_id"  TEXT    NOT NULL,
    "label"    TEXT    NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "brd_poll_options_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_poll_options_poll_fk" FOREIGN KEY ("poll_id") REFERENCES "brd_polls" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "brd_poll_votes" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "option_id"  TEXT         NOT NULL,
    "poll_id"    TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_poll_votes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_poll_votes_unique" UNIQUE ("option_id", "user_id"),
    CONSTRAINT "brd_poll_votes_option_fk" FOREIGN KEY ("option_id") REFERENCES "brd_poll_options" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_poll_votes_poll_fk" FOREIGN KEY ("poll_id") REFERENCES "brd_polls" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_poll_votes_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
-- used to enforce single-choice when allow_multiple is false, app-side
CREATE INDEX IF NOT EXISTS "brd_poll_votes_poll_user_idx" ON "brd_poll_votes" ("poll_id", "user_id");

-- ---------------------------------------------------------------------------
-- User profiles (forum identity, deleted with the user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_user_profiles" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"      TEXT         NOT NULL,
    -- unique public handle, drives /boards/u/<username>
    "username"     TEXT         NOT NULL,
    "signature"    TEXT,
    -- Media.id; no FK
    "avatar_id"    TEXT,
    "bio"          TEXT,
    -- denormalised
    "post_count"   INTEGER      NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_user_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_user_profiles_user_unique" UNIQUE ("user_id"),
    CONSTRAINT "brd_user_profiles_username_unique" UNIQUE ("username"),
    CONSTRAINT "brd_user_profiles_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Bans (forum-level sanctions; does not touch the core user's account/sessions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_bans" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"    TEXT         NOT NULL,
    "reason"     TEXT,
    -- NULL = indefinite
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_bans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_bans_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_bans_user_expires_idx" ON "brd_bans" ("user_id", "expires_at");

-- ---------------------------------------------------------------------------
-- IP bans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_ip_bans" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "ip_address" TEXT         NOT NULL,
    "reason"     TEXT,
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_ip_bans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_ip_bans_ip_unique" UNIQUE ("ip_address")
);
CREATE INDEX IF NOT EXISTS "brd_ip_bans_ip_expires_idx" ON "brd_ip_bans" ("ip_address", "expires_at");

-- ---------------------------------------------------------------------------
-- Moderation queue (pre-moderated first posts, filter hits)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_moderation_queue" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    -- 'THREAD' | 'POST' - no FK on item_id (polymorphic); app code joins on item_type
    "item_type"    TEXT         NOT NULL,
    "item_id"      TEXT         NOT NULL,
    "reason"       TEXT         NOT NULL,
    -- 'OPEN' | 'APPROVED' | 'REJECTED'
    "status"       TEXT         NOT NULL DEFAULT 'OPEN',
    "resolved_by"  TEXT,
    "resolved_at"  TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_moderation_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_moderation_queue_item_type_check" CHECK ("item_type" IN ('THREAD','POST')),
    CONSTRAINT "brd_moderation_queue_status_check" CHECK ("status" IN ('OPEN','APPROVED','REJECTED')),
    CONSTRAINT "brd_moderation_queue_resolved_by_fk" FOREIGN KEY ("resolved_by") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_moderation_queue_status_created_idx" ON "brd_moderation_queue" ("status", "created_at");

-- ---------------------------------------------------------------------------
-- Reports (member-filed flags)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_reports" (
    "item_type"    TEXT         NOT NULL,
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "item_id"      TEXT         NOT NULL,
    "reporter_id"  TEXT,
    "reason"       TEXT         NOT NULL,
    -- 'OPEN' | 'RESOLVED' | 'DISMISSED'
    "status"       TEXT         NOT NULL DEFAULT 'OPEN',
    "resolved_by"  TEXT,
    "resolved_at"  TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_reports_item_type_check" CHECK ("item_type" IN ('THREAD','POST')),
    CONSTRAINT "brd_reports_status_check" CHECK ("status" IN ('OPEN','RESOLVED','DISMISSED')),
    CONSTRAINT "brd_reports_reporter_fk" FOREIGN KEY ("reporter_id") REFERENCES "User" ("id") ON DELETE SET NULL,
    CONSTRAINT "brd_reports_resolved_by_fk" FOREIGN KEY ("resolved_by") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_reports_status_created_idx" ON "brd_reports" ("status", "created_at");

-- ---------------------------------------------------------------------------
-- Moderation log (append-only audit of moderator actions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_moderation_log" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "actor_id"   TEXT,
    -- snapshot
    "actor_name" TEXT         NOT NULL,
    "action"     TEXT         NOT NULL,
    "item_type"  TEXT,
    "item_id"    TEXT,
    "detail"     JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_moderation_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_moderation_log_actor_fk" FOREIGN KEY ("actor_id") REFERENCES "User" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "brd_moderation_log_created_idx" ON "brd_moderation_log" ("created_at" DESC);

-- ---------------------------------------------------------------------------
-- Subscriptions (consumer side)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_thread_subscriptions" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "thread_id"  TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_thread_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_thread_subscriptions_unique" UNIQUE ("thread_id", "user_id"),
    CONSTRAINT "brd_thread_subscriptions_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "brd_threads" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_thread_subscriptions_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_thread_subscriptions_user_idx" ON "brd_thread_subscriptions" ("user_id");

CREATE TABLE IF NOT EXISTS "brd_board_subscriptions" (
    "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "board_id"   TEXT         NOT NULL,
    "user_id"    TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_board_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_board_subscriptions_unique" UNIQUE ("board_id", "user_id"),
    CONSTRAINT "brd_board_subscriptions_board_fk" FOREIGN KEY ("board_id") REFERENCES "brd_boards" ("id") ON DELETE CASCADE,
    CONSTRAINT "brd_board_subscriptions_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "brd_board_subscriptions_user_idx" ON "brd_board_subscriptions" ("user_id");

-- ---------------------------------------------------------------------------
-- Notification preferences (per-user Boards delivery preferences)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_notification_prefs" (
    "user_id"         TEXT         NOT NULL,
    -- 'IMMEDIATE' | 'DIGEST' | 'OFF'
    "mode"            TEXT         NOT NULL DEFAULT 'IMMEDIATE',
    "email_enabled"   BOOLEAN      NOT NULL DEFAULT true,
    -- low-water mark for the digest cron
    "last_digest_at"  TIMESTAMP(3),
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_notification_prefs_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "brd_notification_prefs_mode_check" CHECK ("mode" IN ('IMMEDIATE','DIGEST','OFF')),
    CONSTRAINT "brd_notification_prefs_user_fk" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Thread templates (mirrors gz_post_templates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_thread_templates" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "title"        TEXT         NOT NULL,
    "builder_data" JSONB,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_thread_templates_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Import jobs (one row per import run)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_import_jobs" (
    "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    -- 'PHPBB' | 'DISCOURSE'
    "source"       TEXT         NOT NULL,
    -- 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
    "status"       TEXT         NOT NULL DEFAULT 'PENDING',
    -- counts: boards/threads/posts imported, skipped, errors
    "stats"        JSONB,
    "error"        TEXT,
    "created_by"   TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_import_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_import_jobs_source_check" CHECK ("source" IN ('PHPBB','DISCOURSE')),
    CONSTRAINT "brd_import_jobs_status_check" CHECK ("status" IN ('PENDING','RUNNING','DONE','FAILED'))
);

-- ---------------------------------------------------------------------------
-- Settings (singleton row, seeded here)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "brd_settings" (
    "id"                            TEXT         NOT NULL DEFAULT 'singleton',
    "threads_per_page"               INTEGER      NOT NULL DEFAULT 20,
    "posts_per_page"                 INTEGER      NOT NULL DEFAULT 20,
    "rss_enabled"                    BOOLEAN      NOT NULL DEFAULT true,
    "feed_title"                     TEXT,
    "feed_description"               TEXT,
    "reactions_enabled"              BOOLEAN      NOT NULL DEFAULT true,
    -- null = code default, mirrors Gazette
    "reaction_set"                   JSONB,
    "signatures_enabled"             BOOLEAN      NOT NULL DEFAULT true,
    "signature_max_length"           INTEGER      NOT NULL DEFAULT 500,
    -- 0 = off; independent of the approval queue
    "min_account_age_days"           INTEGER      NOT NULL DEFAULT 0,
    -- 0 = off (queue rule)
    "first_post_count"               INTEGER      NOT NULL DEFAULT 3,
    "first_post_account_age_days"    INTEGER      NOT NULL DEFAULT 7,
    "post_cooldown_seconds"          INTEGER      NOT NULL DEFAULT 30,
    "posts_per_hour_limit"           INTEGER      NOT NULL DEFAULT 20,
    -- 0 = unlimited; moderators/admins exempt
    "edit_window_minutes"            INTEGER      NOT NULL DEFAULT 0,
    "show_view_counts"               BOOLEAN      NOT NULL DEFAULT true,
    "updated_at"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brd_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brd_settings_singleton" CHECK ("id" = 'singleton')
);
INSERT INTO "brd_settings" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;
