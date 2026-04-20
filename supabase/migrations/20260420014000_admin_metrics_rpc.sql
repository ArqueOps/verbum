-- Realignment — Fase 3.9
-- Admin metrics: RPC consolidada com todos os agregados pedidos em
-- verbum-features-completo.md item #8.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_result jsonb;
BEGIN
  -- Admin gate
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM profiles),
      'active_30d', (SELECT COUNT(DISTINCT owner_id) FROM studies WHERE created_at > now() - interval '30 days'),
      'dau', (SELECT COUNT(DISTINCT owner_id) FROM studies WHERE created_at > now() - interval '1 day'),
      'mau', (SELECT COUNT(DISTINCT owner_id) FROM studies WHERE created_at > now() - interval '30 days'),
      'paying', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND current_period_end > now()),
      'free', GREATEST(0, (SELECT COUNT(*) FROM profiles) - (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND current_period_end > now()))
    ),
    'subscriptions', jsonb_build_object(
      'active', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND current_period_end > now()),
      'cancellations_30d', (SELECT COUNT(*) FROM subscription_cancellations WHERE cancelled_at > now() - interval '30 days'),
      'cancellation_reasons_30d', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('reason', reason, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT reason, COUNT(*) AS c
          FROM subscription_cancellations
          WHERE cancelled_at > now() - interval '30 days'
          GROUP BY reason
          ORDER BY c DESC
          LIMIT 10
        ) t
      )
    ),
    'studies', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM studies),
      'last_7_days', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day, 'count', c) ORDER BY day), '[]'::jsonb)
        FROM (
          SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS c
          FROM studies
          WHERE created_at > now() - interval '7 days'
          GROUP BY day
        ) t
      ),
      'top_books', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('book', book, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT book, COUNT(*) AS c FROM studies WHERE book IS NOT NULL
          GROUP BY book ORDER BY c DESC LIMIT 10
        ) t
      )
    ),
    'topic_searches', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM topic_searches),
      'top_queries', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('query', query, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT query, COUNT(*) AS c FROM topic_searches
          GROUP BY query ORDER BY c DESC LIMIT 10
        ) t
      )
    ),
    'blog', jsonb_build_object(
      'published', (SELECT COUNT(*) FROM studies WHERE is_published = true),
      'total_views', (SELECT COALESCE(SUM(view_count), 0) FROM studies WHERE is_published = true),
      'top_viewed', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('title', title, 'slug', slug, 'views', view_count)), '[]'::jsonb)
        FROM (
          SELECT title, slug, view_count FROM studies
          WHERE is_published = true
          ORDER BY view_count DESC NULLS LAST LIMIT 10
        ) t
      )
    ),
    'feedback', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM study_feedback),
      'useful_ratio', (
        SELECT CASE WHEN COUNT(*) > 0
          THEN ROUND(100.0 * COUNT(*) FILTER (WHERE useful) / COUNT(*), 1)
          ELSE NULL END
        FROM study_feedback
      )
    ),
    'shares', jsonb_build_object(
      'by_channel_30d', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('channel', channel, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT channel, COUNT(*) AS c
          FROM share_events
          WHERE created_at > now() - interval '30 days'
          GROUP BY channel ORDER BY c DESC
        ) t
      )
    ),
    'demography', jsonb_build_object(
      'by_locale', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('locale', locale, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT locale, COUNT(*) AS c FROM profiles
          WHERE locale IS NOT NULL
          GROUP BY locale ORDER BY c DESC
        ) t
      ),
      'by_sex', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('sex', sex, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT sex::text, COUNT(*) AS c FROM profiles
          WHERE sex IS NOT NULL
          GROUP BY sex ORDER BY c DESC
        ) t
      ),
      'by_age_bracket', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('bracket', bracket, 'count', c)), '[]'::jsonb)
        FROM (
          SELECT
            CASE
              WHEN age < 20 THEN '<20'
              WHEN age < 30 THEN '20-29'
              WHEN age < 40 THEN '30-39'
              WHEN age < 50 THEN '40-49'
              WHEN age < 60 THEN '50-59'
              ELSE '60+'
            END AS bracket,
            COUNT(*) AS c
          FROM profiles
          WHERE age IS NOT NULL
          GROUP BY bracket
          ORDER BY bracket
        ) t
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;
