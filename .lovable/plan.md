
# Moderator Remaining Features

## What's Currently Built

The moderator panel (`/moderator`) has 4 tabs:
- Posts — view & delete community posts
- Events — view & delete upcoming events
- Communities — view community overview
- Balance — moderation score and weekly chart

It is missing several key features that make it a complete moderation system.

---

## Features to Add

### 1. Content Reporting System (New Database Table)
A `content_reports` table will be created so regular users can flag posts or events as inappropriate. Moderators will see all pending reports in a new "Reports" tab with the ability to dismiss or act on them.

- Fields: `id`, `reporter_id`, `content_type` (post/event/comment), `content_id`, `reason`, `status` (pending/reviewed/dismissed), `created_at`
- RLS: users can insert their own reports; moderators/admins can view and update all

### 2. Reports Tab in Moderator Panel
A dedicated "Reports" tab will replace the placeholder "0 Reported" stat card with real data:
- List of flagged posts/events with reporter info and reason
- "Take Action" button → deletes the reported content and marks the report as reviewed
- "Dismiss" button → marks report as false/invalid without deleting content

### 3. User Warning System (New Database Table)
A `user_warnings` table lets moderators issue formal warnings to users whose content violates guidelines.
- Fields: `id`, `user_id`, `moderator_id`, `reason`, `warning_type` (warning/mute), `created_at`
- Added as an action on the Posts tab alongside the existing delete button: a "Warn User" button opens a dialog to select warning type and enter a reason

### 4. Moderation Action History Tab
A "History" tab that logs every action taken by the current moderator (post deletions, warnings issued, reports resolved). This is powered by the `content_reports` table (resolved by this moderator) and `user_warnings` (issued by this moderator), merged and sorted by date.

### 5. Post Comments Moderation
The Posts tab currently only shows top-level posts. A "View Comments" expand/collapse button will be added to each post card so moderators can see and delete individual comments on a post.

### 6. Moderator Quick-Access Link in Profile & Dashboard
Users with the moderator role will see a "Moderator Panel" shortcut card on the Dashboard and a link in the Profile page settings section, so they can navigate to `/moderator` without manually typing the URL.

---

## Technical Plan

### Database Migrations

**Migration 1: `content_reports` table**
```sql
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL,  -- 'post', 'event', 'comment'
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'reviewed', 'dismissed'
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Users can create reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Moderators and admins can view all reports
CREATE POLICY "Moderators can view all reports" ON public.content_reports
  FOR SELECT USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Moderators and admins can update reports (mark reviewed/dismissed)
CREATE POLICY "Moderators can update reports" ON public.content_reports
  FOR UPDATE USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
```

**Migration 2: `user_warnings` table**
```sql
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  moderator_id uuid NOT NULL,
  reason text NOT NULL,
  warning_type text NOT NULL DEFAULT 'warning',  -- 'warning', 'mute'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can insert warnings
CREATE POLICY "Moderators can issue warnings" ON public.user_warnings
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Moderators and admins can view warnings
CREATE POLICY "Moderators can view warnings" ON public.user_warnings
  FOR SELECT USING (
    has_role(auth.uid(), 'moderator'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Users can view their own warnings
CREATE POLICY "Users can view own warnings" ON public.user_warnings
  FOR SELECT USING (auth.uid() = user_id);
```

### Files to Create / Edit

**New Components:**
- `src/components/moderator/ReportsTab.tsx` — shows flagged content with action/dismiss buttons; fetches from `content_reports`
- `src/components/moderator/WarnUserDialog.tsx` — dialog to issue a warning with a reason and warning type selector
- `src/components/moderator/HistoryTab.tsx` — merges `user_warnings` and resolved `content_reports` for the logged-in moderator, sorted by date

**New Component (Shared UI):**
- `src/components/ReportContentDialog.tsx` — a reusable button+dialog allowing any authenticated user to flag a post or event with a reason; used inside `CommunityFeed.tsx` and `EventDetail.tsx`

**Modified Pages:**
- `src/pages/Moderator.tsx`:
  - Add "Reports" tab (using `ReportsTab` component)
  - Add "History" tab (using `HistoryTab` component)
  - Update tab grid to `grid-cols-3` on desktop / scrollable on mobile (5 tabs total: Posts, Events, Communities, Reports, History)
  - Add "Warn User" button to each post row (opens `WarnUserDialog`)
  - Add comment expansion to each post row (loads `post_comments` from Supabase)
  - Fix "Reported" stat card to show real count from `content_reports` where `status = 'pending'`

- `src/pages/Dashboard.tsx`:
  - After loading session, check if user has moderator/admin role
  - If yes, show a "Moderator Panel" shortcut card in the quick actions section

- `src/pages/Profile.tsx`:
  - Check for moderator role after loading profile
  - Show a "Moderator Panel" button in the settings/actions section

### Tab Layout (Updated Moderator Panel)

```text
┌─────────────────────────────────────────────┐
│  Posts │ Events │ Comms │ Reports │ History  │
└─────────────────────────────────────────────┘
```

On mobile, the tab list will use `overflow-x-auto` with `flex` instead of `grid` so all 5 tabs are horizontally scrollable without wrapping.

### Report Flow (User → Moderator)
```text
User sees a post → taps "Report" icon → 
  ReportContentDialog opens → selects reason → submits → 
    content_reports row inserted (status=pending)

Moderator opens Reports tab → sees pending reports → 
  clicks "Take Action" → content deleted + report marked reviewed
  OR clicks "Dismiss" → report marked dismissed
```

### Warning Flow
```text
Moderator sees a post → clicks warn icon → 
  WarnUserDialog opens → enters reason + type → 
    user_warnings row inserted → toast shown
```

### Balance Tab Update
The Balance tab's `postsDeleted` and `actionsThisWeek` values (currently hardcoded at 0) will be pulled from real data:
- `postsDeleted` → count of `content_reports` reviewed by this moderator where action was taken
- `actionsThisWeek` → count of `user_warnings` + resolved `content_reports` created this week by this moderator
