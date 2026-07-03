# Cactus Boards Module

A discussion forum for [Cactus](https://github.com/usersaynoso/cactus-foundation).

Boards, sub-boards, threads and replies for registered users, with polls,
reactions, subscriptions, bookmarks, read tracking, search, moderation
(queue, reports, bans, log), a phpBB/Discourse importer, RSS feeds and daily
email digests. Thread openers are composed with a Puck-based, forum-focused
block palette (prose, pull quotes, code, images, polls, embeds) - not the full
page-builder palette.

## Installation

Install the module from the Cactus admin panel under Modules.

## Configuration

Once installed, configure the module under Admin -> Boards -> Settings, and
grant the `boards.access` permission to whichever core role(s) should see the
Boards nav entry, and `boards.manage` to whichever should manage structure,
tags, templates and imports. Board and Global Moderators are assigned per-user
from Admin -> Boards -> Moderators by a core admin.

## License

MIT
