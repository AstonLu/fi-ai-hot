-- Google 新聞轉址（news.google.com/rss/articles/<id>）還原成的原文網址，一則只還原一次。
CREATE TABLE IF NOT EXISTS google_news_links (article_id text PRIMARY KEY, url text NOT NULL, resolved_at timestamptz NOT NULL DEFAULT now());
